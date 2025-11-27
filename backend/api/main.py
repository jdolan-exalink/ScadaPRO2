from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from database import engine, Base, get_db, AsyncSessionLocal
import models, schemas
import json
import asyncio
import logging
import paho.mqtt.client as mqtt
import os
import secrets
import traceback
from typing import List, Dict, Set, Optional
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import re
from config_manager import (
    get_all_machines,
    read_machine,
    create_machine,
    update_machine,
    delete_machine,
    get_machine_settings,
    add_machine_to_settings,
    remove_machine_from_settings,
    enable_machine_in_settings,
    disable_machine_in_settings,
    toggle_machine_in_settings
)

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

# Version
VERSION = "0.9"

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[WebSocket, Set[str]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = set()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]

    async def subscribe(self, websocket: WebSocket, sensor_codes: List[str]):
        if websocket in self.subscriptions:
            self.subscriptions[websocket].update(sensor_codes)

    async def broadcast_sensor_data(self, data: dict):
        sensor_code = data.get("sensor_code")
        # Format for frontend
        message = {
            "type": "measurement",
            "sensor_code": sensor_code,
            "timestamp": data.get("timestamp"),
            "value": data.get("value"),
            "unit": data.get("unit")
        }
        
        to_remove = []
        for connection in self.active_connections:
            try:
                if sensor_code in self.subscriptions.get(connection, set()):
                    await connection.send_json(message)
            except Exception:
                to_remove.append(connection)
        
        for connection in to_remove:
            self.disconnect(connection)

manager = ConnectionManager()

import yaml

# MQTT Setup
CONFIG_PATH = os.getenv("CONFIG_PATH", "/app/config")
SETTINGS_FILE = os.path.join(CONFIG_PATH, "settings.yml")

# Token Management
API_TOKEN_FILE = os.path.join(CONFIG_PATH, "api_token.txt")
API_TOKEN = None

def get_or_create_token():
    global API_TOKEN
    if os.path.exists(API_TOKEN_FILE):
        with open(API_TOKEN_FILE, "r") as f:
            API_TOKEN = f.read().strip()
    
    if not API_TOKEN:
        API_TOKEN = secrets.token_urlsafe(32)
        # Ensure directory exists
        os.makedirs(os.path.dirname(API_TOKEN_FILE), exist_ok=True)
        with open(API_TOKEN_FILE, "w") as f:
            f.write(API_TOKEN)
        print(f"🔑 Generated new API Token: {API_TOKEN}")
        print(f"📂 Saved to: {API_TOKEN_FILE}")
    else:
        print(f"🔑 Loaded API Token from {API_TOKEN_FILE}")
    return API_TOKEN

# Initialize Token
get_or_create_token()

def get_mqtt_config():
    host = os.getenv("MQTT_HOST", "localhost")
    port = int(os.getenv("MQTT_PORT", 1883))
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r") as f:
            config = yaml.safe_load(f)
            mqtt_conf = config.get("mqtt", {})
            host = mqtt_conf.get("host", host)
            port = mqtt_conf.get("port", port)
    return host, port

MQTT_HOST, MQTT_PORT = get_mqtt_config()

# Handle paho-mqtt 2.0.0+ breaking changes
if hasattr(mqtt, 'CallbackAPIVersion'):
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
else:
    mqtt_client = mqtt.Client()

# Global loop reference for threadsafe calls
app_loop = None

def on_connect(client, userdata, flags, reason_code, properties):
    print(f"Connected to MQTT with result code {reason_code}")
    client.subscribe("machines/#")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        # Log for debugging (optional, can be noisy)
        # print(f"MQTT Message received: {payload}")
        if app_loop and app_loop.is_running():
            asyncio.run_coroutine_threadsafe(manager.broadcast_sensor_data(payload), app_loop)
    except Exception as e:
        print(f"Error processing MQTT message: {e}")

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

@asynccontextmanager
async def lifespan(app: FastAPI):
    global app_loop
    app_loop = asyncio.get_running_loop()
    
    # Version banner
    logger.info(f"🚀 Industrial IoT Backend v{VERSION}")
    
    # Create tables with retry
    max_retries = 10
    retry_interval = 5
    for i in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print("✅ Database tables created/verified.")
            break
        except Exception as e:
            print(f"⚠️ Database connection failed (attempt {i+1}/{max_retries}): {e}")
            if i < max_retries - 1:
                await asyncio.sleep(retry_interval)
            else:
                print("❌ Could not connect to database after multiple retries.")
                raise e
    
    # Start MQTT
    try:
        mqtt_client.connect(MQTT_HOST, MQTT_PORT, 60)
        mqtt_client.loop_start()
        await log_system_event("INFO", "SYSTEM", "Backend started successfully")
    except Exception as e:
        print(f"Failed to connect to MQTT: {e}")
        await log_system_event("ERROR", "SYSTEM", f"Failed to connect to MQTT: {e}")
        
    yield
    
    mqtt_client.loop_stop()
    await log_system_event("INFO", "SYSTEM", "Backend shutting down")

app = FastAPI(title="Industrial IoT Backend", version=VERSION, lifespan=lifespan)

async def log_system_event(level: str, source: str, message: str, details: dict = None):
    """Helper to write logs to the database asynchronously"""
    try:
        async with AsyncSessionLocal() as session:
            log_entry = models.SystemLog(
                level=level,
                source=source,
                message=message,
                details=details
            )
            session.add(log_entry)
            await session.commit()
    except Exception as e:
        print(f"❌ Failed to write log to DB: {e}")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = str(exc)
    tb = traceback.format_exc()
    print(f"❌ Global Exception: {error_msg}\n{tb}")
    
    # Log to DB
    await log_system_event(
        level="ERROR",
        source="API",
        message=f"Global Exception: {error_msg}",
        details={"traceback": tb, "path": request.url.path}
    )
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": error_msg, "traceback": tb.splitlines()}
    )

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    if token != API_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid authentication credentials")
    return token

# Routes

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/version")
async def version():
    return {"version": VERSION}

@app.get("/api/logs", response_model=List[schemas.SystemLog], dependencies=[Depends(get_current_user)])
async def get_logs(
    level: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    db: AsyncSession = Depends(get_db)
):
    query = select(models.SystemLog).order_by(desc(models.SystemLog.timestamp))
    
    if level:
        query = query.where(models.SystemLog.level == level)
    if source:
        query = query.where(models.SystemLog.source == source)
        
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/api/export/configuration", response_model=schemas.ConfigurationExport, dependencies=[Depends(get_current_user)])
async def export_configuration(db: AsyncSession = Depends(get_db)):
    machines_result = await db.execute(select(models.Machine))
    machines = machines_result.scalars().all()
    
    sensors_result = await db.execute(select(models.Sensor))
    sensors = sensors_result.scalars().all()
    
    return {
        "assets": machines,
        "sensors": sensors
    }

# Machines
@app.get("/api/machines", response_model=List[schemas.Machine], dependencies=[Depends(get_current_user)])
async def get_machines(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Machine))
    return result.scalars().all()

@app.get("/api/machines/{machine_id}", response_model=schemas.Machine, dependencies=[Depends(get_current_user)])
async def get_machine(machine_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Machine).where(models.Machine.id == machine_id))
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine

# PLCs
@app.get("/api/plcs", response_model=List[schemas.PLC], dependencies=[Depends(get_current_user)])
async def get_plcs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PLC))
    return result.scalars().all()

@app.get("/api/plcs/{plc_id}", response_model=schemas.PLC, dependencies=[Depends(get_current_user)])
async def get_plc(plc_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PLC).where(models.PLC.id == plc_id))
    plc = result.scalar_one_or_none()
    if not plc:
        raise HTTPException(status_code=404, detail="PLC not found")
    return plc

@app.patch("/api/plcs/{plc_id}", response_model=schemas.PLC, dependencies=[Depends(get_current_user)])
async def update_plc(plc_id: int, plc_update: schemas.PLCUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.PLC).where(models.PLC.id == plc_id))
    plc = result.scalar_one_or_none()
    if not plc:
        raise HTTPException(status_code=404, detail="PLC not found")
    
    update_data = plc_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plc, key, value)
    
    await db.commit()
    await db.refresh(plc)
    return plc

# Sensores
@app.get("/api/sensors", response_model=List[schemas.Sensor], dependencies=[Depends(get_current_user)])
async def get_sensors(
    machine_code: Optional[str] = None,
    plc_code: Optional[str] = None,
    type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(models.Sensor)
    if machine_code:
        query = query.join(models.PLC).join(models.Machine).where(models.Machine.code == machine_code)
    if plc_code:
        if not machine_code: # Avoid double join if already joined
            query = query.join(models.PLC)
        query = query.where(models.PLC.code == plc_code)
    if type:
        query = query.where(models.Sensor.type == type)
        
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/api/sensors/mqtt-topics", response_model=List[schemas.SensorWithMQTT], dependencies=[Depends(get_current_user)])
async def get_sensors_with_mqtt_topics(
    machine_code: Optional[str] = None,
    type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la lista completa de sensores con sus topics MQTT para el frontend.
    Incluye: código, nombre, tipo, unidad, formato de display, value_map y topic MQTT.
    """
    query = select(
        models.Sensor,
        models.PLC.code.label("plc_code"),
        models.Machine.code.label("machine_code"),
        models.Machine.name.label("machine_name")
    ).select_from(models.Sensor).join(
        models.PLC, models.Sensor.plc_id == models.PLC.id
    ).join(
        models.Machine, models.PLC.machine_id == models.Machine.id
    )
    
    if machine_code:
        query = query.where(models.Machine.code == machine_code)
    if type:
        query = query.where(models.Sensor.type == type)
    
    result = await db.execute(query)
    rows = result.all()
    
    sensors_with_mqtt = []
    for row in rows:
        sensor = row[0]
        plc_code = row[1]
        machine_code_val = row[2]
        machine_name = row[3]
        
        # Build MQTT topic
        mqtt_topic = f"machines/{machine_code_val}/{plc_code}/{sensor.code}"
        
        # Extract value_map from metadata if present
        value_map = None
        if sensor.metadata_info and "value_map" in sensor.metadata_info:
            value_map = sensor.metadata_info["value_map"]
        
        sensors_with_mqtt.append(schemas.SensorWithMQTT(
            id=sensor.id,
            code=sensor.code,
            name=sensor.name,
            type=sensor.type,
            unit=sensor.unit,
            display_format=sensor.display_format,
            value_map=value_map,
            mqtt_topic=mqtt_topic,
            machine_code=machine_code_val,
            machine_name=machine_name,
            plc_code=plc_code
        ))
    
    return sensors_with_mqtt

@app.get("/api/sensors/{sensor_id}", response_model=schemas.Sensor, dependencies=[Depends(get_current_user)])
async def get_sensor(sensor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Sensor).where(models.Sensor.id == sensor_id))
    sensor = result.scalar_one_or_none()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return sensor

@app.get("/api/sensors/{sensor_id}/history", response_model=List[schemas.SensorDataPoint], dependencies=[Depends(get_current_user)])
async def get_sensor_history(
    sensor_id: int,
    start: datetime = Query(alias="from"),
    end: datetime = Query(alias="to"),
    db: AsyncSession = Depends(get_db)
):
    # Basic history query, no aggregation for now
    query = select(models.SensorData).where(
        models.SensorData.sensor_id == sensor_id,
        models.SensorData.timestamp >= start,
        models.SensorData.timestamp <= end
    ).order_by(models.SensorData.timestamp.asc())
    
    result = await db.execute(query)
    data = result.scalars().all()
    return data

# Configuration Management Helpers
def parse_settings_machines():
    machines = []
    if not os.path.exists(SETTINGS_FILE):
        return machines
    
    with open(SETTINGS_FILE, 'r') as f:
        lines = f.readlines()
        
    in_machines = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('machines:'):
            in_machines = True
            continue
        
        if in_machines:
            # Check if we are still in machines section
            if re.match(r'^\s*-\s+', line):
                filename = re.sub(r'^\s*-\s+', '', line).strip()
                machines.append({"filename": filename, "enabled": True})
            elif re.match(r'^\s*#-\s+', line):
                filename = re.sub(r'^\s*#-\s+', '', line).strip()
                machines.append({"filename": filename, "enabled": False})
            elif stripped and not stripped.startswith('#'):
                # If it's not a comment and not a list item, assume end of section
                if ':' in stripped: 
                    in_machines = False
    return machines

def save_settings_machines(new_config: List[schemas.MachineConfigFile]):
    if not os.path.exists(SETTINGS_FILE):
        return
        
    with open(SETTINGS_FILE, 'r') as f:
        lines = f.readlines()
        
    new_lines = []
    in_machines = False
    machines_written = False
    
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('machines:'):
            new_lines.append(line)
            in_machines = True
            # Write all new machines here
            for m in new_config:
                prefix = "- " if m.enabled else "#- "
                new_lines.append(f"{prefix}{m.filename}\n")
            machines_written = True
            continue
            
        if in_machines:
            # Skip existing machine lines (enabled or disabled)
            if re.match(r'^\s*-\s+', line) or re.match(r'^\s*#-\s+', line):
                continue
            # If we hit something else (and not just a comment/empty), end section
            if stripped and not stripped.startswith('#'):
                 in_machines = False
                 new_lines.append(line)
            elif not stripped: 
                # Skip empty lines inside the list
                pass
            else:
                # Preserve other comments
                if not re.match(r'^\s*#-\s+', line):
                     new_lines.append(line)
        else:
            new_lines.append(line)
            
    with open(SETTINGS_FILE, 'w') as f:
        f.writelines(new_lines)

@app.get("/api/admin/machines-config", response_model=List[schemas.MachineConfigFile], dependencies=[Depends(get_current_user)])
async def get_machines_config():
    """Get the list of machine configuration files and their enabled status from settings.yml"""
    return parse_settings_machines()

@app.post("/api/admin/machines-config", dependencies=[Depends(get_current_user)])
async def update_machines_config(config: schemas.MachineConfigUpdate):
    """Update the enabled status of machine configuration files in settings.yml"""
    try:
        save_settings_machines(config.files)
        await log_system_event("INFO", "API", "Updated machine configuration in settings.yml")
        return {"status": "ok", "message": "Configuration updated. You may need to restart the collector."}
    except Exception as e:
        await log_system_event("ERROR", "API", f"Failed to update settings.yml: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket
@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("action") == "subscribe":
                sensors = data.get("sensors", [])
                await manager.subscribe(websocket, sensors)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# ===== ALARMAS =====

@app.get("/api/alarms", response_model=List[schemas.MachineAlarmResponse], dependencies=[Depends(get_current_user)])
async def get_all_alarms(
    machine_code: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[int] = None,
    limit: int = 100,
    skip: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener todas las alarmas con filtros opcionales
    - machine_code: filtrar por máquina
    - severity: filtrar por severidad (high, critical, medium, low)
    - status: filtrar por estado (1=activa, 0=inactiva)
    """
    query = select(
        models.MachineAlarm,
        models.Machine.code.label("machine_code"),
        models.Machine.name.label("machine_name"),
        models.Sensor.code.label("sensor_code"),
        models.Sensor.name.label("sensor_name")
    ).select_from(models.MachineAlarm).join(
        models.Machine, models.MachineAlarm.machine_id == models.Machine.id
    ).join(
        models.Sensor, models.MachineAlarm.sensor_id == models.Sensor.id, isouter=True  # LEFT JOIN para sensor_id nullable
    ).order_by(desc(models.MachineAlarm.timestamp_on))
    
    if machine_code:
        query = query.where(models.Machine.code == machine_code)
    if severity:
        query = query.where(models.MachineAlarm.severity == severity)
    if status is not None:
        query = query.where(models.MachineAlarm.status == status)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    rows = result.all()
    
    alarms_response = []
    for row in rows:
        alarm = row[0]
        alarm_data = schemas.MachineAlarmResponse(
            id=alarm.id,
            alarm_code=alarm.alarm_code,
            alarm_name=alarm.alarm_name,
            severity=alarm.severity,
            color=alarm.color,
            machine_id=alarm.machine_id,
            sensor_id=alarm.sensor_id,
            status=alarm.status,
            timestamp_on=alarm.timestamp_on,
            timestamp_off=alarm.timestamp_off,
            created_at=alarm.created_at,
            updated_at=alarm.updated_at,
            machine_code=row[1],
            machine_name=row[2],
            sensor_code=row[3],
            sensor_name=row[4]
        )
        alarms_response.append(alarm_data)
    
    return alarms_response

@app.get("/api/alarms/active", response_model=List[schemas.MachineAlarmResponse], dependencies=[Depends(get_current_user)])
async def get_active_alarms(
    machine_code: Optional[str] = None,
    severity: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener solo las alarmas activas (status=1 y timestamp_off es NULL)
    """
    query = select(
        models.MachineAlarm,
        models.Machine.code.label("machine_code"),
        models.Machine.name.label("machine_name"),
        models.Sensor.code.label("sensor_code"),
        models.Sensor.name.label("sensor_name")
    ).select_from(models.MachineAlarm).join(
        models.Machine, models.MachineAlarm.machine_id == models.Machine.id
    ).join(
        models.Sensor, models.MachineAlarm.sensor_id == models.Sensor.id, isouter=True  # LEFT JOIN para sensor_id nullable
    ).where(
        models.MachineAlarm.status == 1,
        models.MachineAlarm.timestamp_off == None
    ).order_by(desc(models.MachineAlarm.timestamp_on))
    
    if machine_code:
        query = query.where(models.Machine.code == machine_code)
    if severity:
        query = query.where(models.MachineAlarm.severity == severity)
    
    result = await db.execute(query)
    rows = result.all()
    
    alarms_response = []
    for row in rows:
        alarm = row[0]
        alarm_data = schemas.MachineAlarmResponse(
            id=alarm.id,
            alarm_code=alarm.alarm_code,
            alarm_name=alarm.alarm_name,
            severity=alarm.severity,
            color=alarm.color,
            machine_id=alarm.machine_id,
            sensor_id=alarm.sensor_id,
            status=alarm.status,
            timestamp_on=alarm.timestamp_on,
            timestamp_off=alarm.timestamp_off,
            created_at=alarm.created_at,
            updated_at=alarm.updated_at,
            machine_code=row[1],
            machine_name=row[2],
            sensor_code=row[3],
            sensor_name=row[4]
        )
        alarms_response.append(alarm_data)
    
    return alarms_response

@app.get("/api/machines/{machine_id}/alarms", response_model=List[schemas.MachineAlarmHistory], dependencies=[Depends(get_current_user)])
async def get_machine_alarms(
    machine_id: int,
    status: Optional[int] = None,
    limit: int = 100,
    skip: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener el historial de alarmas de una máquina específica
    """
    query = select(models.MachineAlarm).where(
        models.MachineAlarm.machine_id == machine_id
    ).order_by(desc(models.MachineAlarm.timestamp_on))
    
    if status is not None:
        query = query.where(models.MachineAlarm.status == status)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    alarms = result.scalars().all()
    
    alarms_history = []
    for alarm in alarms:
        alarm_hist = schemas.MachineAlarmHistory(
            id=alarm.id,
            alarm_code=alarm.alarm_code,
            alarm_name=alarm.alarm_name,
            severity=alarm.severity,
            timestamp_on=alarm.timestamp_on,
            timestamp_off=alarm.timestamp_off,
            is_active=alarm.timestamp_off is None
        )
        alarms_history.append(alarm_hist)
    
    return alarms_history

@app.post("/api/alarms", response_model=schemas.MachineAlarm, dependencies=[Depends(get_current_user)])
async def create_alarm(
    alarm: schemas.MachineAlarmCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una alarma manualmente (normalmente se crean automáticamente desde el collector)
    """
    from datetime import datetime
    alarm_dict = alarm.dict()
    
    # Auto-generar timestamp_on si no se proporciona
    if alarm_dict.get("timestamp_on") is None:
        alarm_dict["timestamp_on"] = datetime.utcnow()
    
    db_alarm = models.MachineAlarm(**alarm_dict)
    db.add(db_alarm)
    await db.commit()
    await db.refresh(db_alarm)
    return db_alarm

@app.patch("/api/alarms/{alarm_id}", response_model=schemas.MachineAlarm, dependencies=[Depends(get_current_user)])
async def update_alarm_status(
    alarm_id: int,
    status: int,
    timestamp_off: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar el estado de una alarma (por ejemplo, desactivarla)
    """
    result = await db.execute(select(models.MachineAlarm).where(models.MachineAlarm.id == alarm_id))
    alarm = result.scalar_one_or_none()
    
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    
    alarm.status = status
    if timestamp_off:
        alarm.timestamp_off = timestamp_off
    
    await db.commit()
    await db.refresh(alarm)
    return alarm


# ============= MACHINE CONFIGURATION FILE MANAGEMENT =============

@app.get("/api/machines-config", response_model=List[schemas.MachineYMLResponse], dependencies=[Depends(get_current_user)])
async def list_machine_files():
    """
    Get all machine configuration files from config/machines directory.
    Returns the list of YAML files with their metadata.
    """
    machines = get_all_machines()
    return [
        schemas.MachineYMLResponse(
            machine_code=m.get("code"),
            machine_name=m.get("name"),
            filename=m.get("filename"),
            data=m.get("data")
        )
        for m in machines
    ]


@app.get("/api/machines-config/{machine_code}", response_model=schemas.MachineYMLResponse, dependencies=[Depends(get_current_user)])
async def get_machine_file(machine_code: str):
    """
    Get a specific machine configuration file.
    """
    machine_data = read_machine(machine_code)
    if not machine_data:
        raise HTTPException(status_code=404, detail=f"Machine configuration '{machine_code}' not found")
    
    machine_info = machine_data.get("machine", {})
    return schemas.MachineYMLResponse(
        machine_code=machine_code,
        machine_name=machine_info.get("name"),
        filename=f"{machine_code}.yml",
        data=machine_data
    )


@app.post("/api/machines-config", response_model=schemas.MachineYMLResponse, dependencies=[Depends(get_current_user)])
async def create_machine_file(machine_config: schemas.MachineYMLCreate):
    """
    Create a new machine configuration file.
    
    Example request body:
    ```json
    {
        "machine_code": "sec21",
        "machine_name": "Secadora 21",
        "config": {
            "machine": {
                "code": "sec21",
                "name": "Secadora 21"
            },
            "plc": {
                "code": "sec21_plc",
                "name": "PLC Secadora 21",
                "protocol": "modbus_tcp",
                "ip_address": "192.168.72.11",
                "port": 502,
                "unit_id": 1,
                "poll_interval_s": 1,
                "enabled": true
            },
            "sensors": []
        }
    }
    ```
    """
    success = create_machine(machine_config.machine_code, machine_config.config)
    if not success:
        raise HTTPException(status_code=409, detail=f"Machine '{machine_config.machine_code}' already exists")
    
    return schemas.MachineYMLResponse(
        machine_code=machine_config.machine_code,
        machine_name=machine_config.machine_name,
        filename=f"{machine_config.machine_code}.yml",
        data=machine_config.config
    )


@app.put("/api/machines-config/{machine_code}", response_model=schemas.MachineYMLResponse, dependencies=[Depends(get_current_user)])
async def update_machine_file(machine_code: str, machine_config: schemas.MachineYMLUpdate):
    """
    Update an existing machine configuration file.
    """
    success = update_machine(machine_code, machine_config.config)
    if not success:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_code}' not found")
    
    machine_info = machine_config.config.get("machine", {})
    return schemas.MachineYMLResponse(
        machine_code=machine_code,
        machine_name=machine_info.get("name"),
        filename=f"{machine_code}.yml",
        data=machine_config.config
    )


@app.delete("/api/machines-config/{machine_code}", dependencies=[Depends(get_current_user)])
async def delete_machine_file(machine_code: str):
    """
    Delete a machine configuration file.
    """
    success = delete_machine(machine_code)
    if not success:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_code}' not found")
    
    return {"message": f"Machine '{machine_code}' deleted successfully"}


# ============= MACHINE SETTINGS MANAGEMENT =============

@app.get("/api/machines-settings", response_model=schemas.MachineSettingsList, dependencies=[Depends(get_current_user)])
async def get_machines_settings():
    """
    Get the list of machines from settings.yml with their enabled/disabled status.
    Machines starting with '#' are disabled, others are enabled.
    """
    machines_list = get_machine_settings()
    return schemas.MachineSettingsList(machines=machines_list)


@app.post("/api/machines-settings", dependencies=[Depends(get_current_user)])
async def add_machine_settings(machine_settings: schemas.MachineSettingsUpdate):
    """
    Add a machine to settings.yml (enable or disable it).
    
    Example: Add a machine as enabled
    ```json
    {
        "path": "machines/sec21.yml",
        "enabled": true
    }
    ```
    """
    success = add_machine_to_settings(machine_settings.path, machine_settings.enabled)
    if not success:
        raise HTTPException(status_code=409, detail=f"Machine '{machine_settings.path}' already exists in settings")
    
    return {
        "message": f"Machine '{machine_settings.path}' added successfully",
        "enabled": machine_settings.enabled
    }


@app.put("/api/machines-settings/{machine_path_encoded}", dependencies=[Depends(get_current_user)])
async def update_machine_settings(machine_path_encoded: str, machine_settings: schemas.MachineSettingsUpdate):
    """
    Update a machine status in settings.yml (enable or disable).
    
    The machine_path_encoded should be the path with '/' encoded as '%2F'.
    For example: 'machines%2Fsec21.yml' for path 'machines/sec21.yml'
    """
    import urllib.parse
    machine_path = urllib.parse.unquote(machine_path_encoded)
    
    if machine_settings.enabled:
        success = enable_machine_in_settings(machine_path)
    else:
        success = disable_machine_in_settings(machine_path)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_path}' not found in settings")
    
    return {
        "message": f"Machine '{machine_path}' updated successfully",
        "enabled": machine_settings.enabled
    }


@app.post("/api/machines-settings/{machine_path_encoded}/toggle", dependencies=[Depends(get_current_user)])
async def toggle_machine_settings(machine_path_encoded: str):
    """
    Toggle the enabled/disabled status of a machine in settings.yml.
    
    The machine_path_encoded should be the path with '/' encoded as '%2F'.
    For example: 'machines%2Fsec21.yml' for path 'machines/sec21.yml'
    """
    import urllib.parse
    machine_path = urllib.parse.unquote(machine_path_encoded)
    
    result = toggle_machine_in_settings(machine_path)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_path}' not found in settings")
    
    # Get current state to return it
    machines_list = get_machine_settings()
    for m in machines_list:
        if m["path"].strip() == machine_path.strip():
            return {
                "message": f"Machine '{machine_path}' toggled successfully",
                "enabled": m["enabled"]
            }
    
    raise HTTPException(status_code=500, detail="Could not determine toggled state")


@app.delete("/api/machines-settings/{machine_path_encoded}", dependencies=[Depends(get_current_user)])
async def remove_machine_settings(machine_path_encoded: str):
    """
    Remove a machine from settings.yml.
    
    The machine_path_encoded should be the path with '/' encoded as '%2F'.
    For example: 'machines%2Fsec21.yml' for path 'machines/sec21.yml'
    """
    import urllib.parse
    machine_path = urllib.parse.unquote(machine_path_encoded)
    
    success = remove_machine_from_settings(machine_path)
    if not success:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_path}' not found in settings")
    
    return {"message": f"Machine '{machine_path}' removed from settings successfully"}
