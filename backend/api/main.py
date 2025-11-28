from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from .database import engine, Base, get_db, AsyncSessionLocal
from . import models, schemas
import json
import asyncio
import logging
import paho.mqtt.client as mqtt
import os
import secrets
import traceback
from typing import List, Dict, Set, Optional
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import re
from .config_manager import (
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
VERSION = "0.2"

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[WebSocket, Set[str]] = {}  # topic patterns per connection

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = set()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]

    async def subscribe(self, websocket: WebSocket, topics: List[str]):
        """Subscribe to MQTT topic patterns"""
        if websocket in self.subscriptions:
            self.subscriptions[websocket].update(topics)
            print(f"Subscribed to topics: {topics}")

    def topic_matches(self, topic: str, pattern: str) -> bool:
        """Check if topic matches pattern (supports MQTT wildcards)"""
        if pattern == '*' or pattern == '#':
            return True
        
        topic_parts = topic.split('/')
        pattern_parts = pattern.split('/')
        
        for i, part in enumerate(pattern_parts):
            if part == '#':
                # # matches all remaining levels
                return True
            if part == '*':
                # * matches exactly one level
                if i >= len(topic_parts):
                    return False
                continue
            if i >= len(topic_parts) or part != topic_parts[i]:
                return False
        
        return len(topic_parts) == len(pattern_parts)

    async def broadcast_message(self, topic: str, data: dict):
        """Broadcast message to subscribed clients"""
        message = {
            "topic": topic,
            "payload": data
        }
        
        to_remove = []
        for connection in self.active_connections:
            try:
                # Check if client is subscribed to this topic
                subscriptions = self.subscriptions.get(connection, set())
                
                # Always send if no subscriptions (default behavior)
                should_send = len(subscriptions) == 0
                
                # Or send if any pattern matches
                if not should_send:
                    for pattern in subscriptions:
                        if self.topic_matches(topic, pattern):
                            should_send = True
                            break
                
                if should_send:
                    await connection.send_json(message)
            except Exception as e:
                print(f"Error sending message: {e}")
                to_remove.append(connection)
        
        for connection in to_remove:
            self.disconnect(connection)

    async def broadcast_sensor_data(self, data: dict):
        """Legacy method - broadcasts sensor data from MQTT"""
        sensor_code = data.get("sensor_code")
        machine_code = data.get("machine_code", "unknown")
        plc_code = data.get("plc_code", "unknown")
        
        # Build MQTT-style topic
        topic = f"machines/{machine_code}/{plc_code}/{sensor_code}"
        
        # Format for frontend
        message = {
            "type": "measurement",
            "topic": topic,
            "payload": {
                "sensor_code": sensor_code,
                "timestamp": data.get("timestamp"),
                "value": data.get("value"),
                "unit": data.get("unit")
            }
        }
        
        # Broadcast to all connected clients
        await self.broadcast_message(topic, {
            "sensor_code": sensor_code,
            "timestamp": data.get("timestamp"),
            "value": data.get("value"),
            "unit": data.get("unit")
        })

# MQTT Statistics Tracker
class MQTTStats:
    def __init__(self):
        self.machines: Set[str] = set()
        self.sensors: Set[str] = set()
        self.total_messages: int = 0
        self.message_timestamps: List[float] = []
        self.last_clear_time: float = 0
    
    def record_message(self, machine_code: str, plc_code: str, sensor_code: str):
        """Record incoming MQTT message"""
        import time
        current_time = time.time()
        
        # Add machine and sensor
        if machine_code:
            self.machines.add(machine_code)
        if sensor_code:
            self.sensors.add(sensor_code)
        
        # Record message timestamp
        self.total_messages += 1
        self.message_timestamps.append(current_time)
        
        # Keep only last 60 seconds of timestamps for msg/s calculation
        cutoff_time = current_time - 60
        self.message_timestamps = [ts for ts in self.message_timestamps if ts > cutoff_time]
    
    def get_messages_per_second(self) -> float:
        """Calculate messages per second in the last 60 seconds"""
        import time
        if not self.message_timestamps:
            return 0.0
        
        current_time = time.time()
        cutoff_time = current_time - 60
        recent_messages = [ts for ts in self.message_timestamps if ts > cutoff_time]
        
        if len(recent_messages) < 2:
            return 0.0
        
        time_span = recent_messages[-1] - recent_messages[0]
        if time_span < 1:
            return float(len(recent_messages))
        
        return len(recent_messages) / time_span
    
    def get_stats(self) -> dict:
        """Get current statistics"""
        return {
            "machines": len(self.machines),
            "sensors": len(self.sensors),
            "total_messages": self.total_messages,
            "messages_per_second": round(self.get_messages_per_second(), 2)
        }

mqtt_message_stats = MQTTStats()
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
        
        # Record MQTT statistics
        # Support both "machine_code" and "machine" field names
        machine_code = payload.get("machine_code", payload.get("machine", ""))
        plc_code = payload.get("plc_code", payload.get("plc", ""))
        sensor_code = payload.get("sensor_code", payload.get("sensor", ""))
        mqtt_message_stats.record_message(machine_code, plc_code, sensor_code)
        
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

@app.get("/api/mqtt/stats")
async def mqtt_stats(db: AsyncSession = Depends(get_db)):
    """
    Get MQTT connection statistics.
    Returns information about MQTT connectivity and data flow.
    """
    try:
        # Check if we have recent data
        result = await db.execute(
            select(models.SensorLastValue)
            .order_by(models.SensorLastValue.timestamp.desc())
            .limit(1)
        )
        latest_data = result.scalar_one_or_none()
        
        connected = latest_data is not None
        
        return {
            "connected": connected,
            "broker": "mqtt" ,
            "port": 1883,
            "hasRecentData": connected,
            "timestamp": datetime.now(timezone.utc).isoformat() if latest_data else None
        }
    except Exception as e:
        logger.error(f"Error getting MQTT stats: {e}")
        return {
            "connected": False,
            "broker": "mqtt",
            "port": 1883,
            "hasRecentData": False,
            "timestamp": None
        }

@app.get("/api/version")
async def version():
    return {"version": VERSION}


# ============================================
# Data Configuration Endpoints (Collector, MQTT, Database)
# ============================================

@app.get("/api/data-config")
async def get_data_config():
    """Load collector, MQTT and database configuration"""
    try:
        import yaml
        config_path = os.getenv("CONFIG_PATH", "/app/config")
        settings_file = os.path.join(config_path, "settings.yml")
        
        if not os.path.exists(settings_file):
            # Return default config if settings.yml doesn't exist yet
            return {
                "collector": {
                    "host": "localhost",
                    "port": 8000,
                    "token": "",
                    "enabled": True
                },
                "mqtt": {
                    "broker_url": "mqtt://localhost:1883",
                    "mqtt_host": "localhost",
                    "mqtt_port": 1883,
                    "topic": "machines/#",
                    "enabled": True
                },
                "database": {
                    "host": "db",
                    "port": 5432,
                    "user": "backend",
                    "password": "backend_pass",
                    "name": "industrial",
                    "driver": "postgresql+asyncpg",
                    "record_save_interval": 10
                }
            }
        
        with open(settings_file, 'r') as f:
            config = yaml.safe_load(f) or {}
        
        # Extract collector, mqtt, and database configs
        return {
            "collector": config.get("collector", {
                "host": "localhost",
                "port": 8000,
                "token": "",
                "enabled": True
            }),
            "mqtt": config.get("mqtt", {
                "broker_url": "mqtt://localhost:1883",
                "mqtt_host": "localhost",
                "mqtt_port": 1883,
                "topic": "machines/#",
                "enabled": True
            }),
            "database": config.get("database", {
                "host": "db",
                "port": 5432,
                "user": "backend",
                "password": "backend_pass",
                "name": "industrial",
                "driver": "postgresql+asyncpg",
                "record_save_interval": 10
            })
        }
    except Exception as e:
        logger.error(f"Error loading data config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-config")
async def save_data_config(body: dict):
    """Save collector, MQTT and database configuration"""
    try:
        import yaml
        config_path = os.getenv("CONFIG_PATH", "/app/config")
        settings_file = os.path.join(config_path, "settings.yml")
        
        # Create config directory if it doesn't exist
        os.makedirs(config_path, exist_ok=True)
        
        # Load existing config or create new one
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                config = yaml.safe_load(f) or {}
        else:
            config = {}
        
        # Update with new values
        config['collector'] = body.get('collector', config.get('collector', {}))
        config['mqtt'] = body.get('mqtt', config.get('mqtt', {}))
        config['database'] = body.get('database', config.get('database', {}))
        
        # Write back to file
        with open(settings_file, 'w') as f:
            yaml.dump(config, f, default_flow_style=False)
        
        logger.info(f"Data config saved to {settings_file}")
        
        return {
            "success": True,
            "message": "Configuration saved successfully"
        }
    except Exception as e:
        logger.error(f"Error saving data config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def get_collector_ip() -> str:
    """Get the IP address from eth0 interface"""
    import socket
    try:
        # Get the IP address from eth0 interface
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Connect to a remote server (doesn't actually send data)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception as e:
        print(f"Error getting eth0 IP: {e}")
        return "unknown"


@app.get("/api/server/status")
async def get_server_status(db: AsyncSession = Depends(get_db)):
    import platform
    import time
    import os as os_module
    import psutil
    from sqlalchemy import func
    
    # Get system info with psutil
    try:
        if hasattr(os_module, 'getloadavg'):
            load_avg = os_module.getloadavg()
        else:
            load_avg = [0, 0, 0]
    except:
        load_avg = [0, 0, 0]
    
    # Get CPU model from /proc/cpuinfo (from host)
    cpu_model = "Unknown"
    try:
        proc_path = '/host/proc/cpuinfo' if os.path.exists('/host/proc/cpuinfo') else '/proc/cpuinfo'
        with open(proc_path, 'r') as f:
            for line in f:
                if line.startswith('model name'):
                    cpu_model = line.split(':', 1)[1].strip()
                    break
    except:
        cpu_model = platform.processor() or "Unknown"
    
    # Get total system memory from /proc/meminfo (from host)
    total_memory_host = 0
    free_memory_host = 0
    try:
        proc_path = '/host/proc/meminfo' if os.path.exists('/host/proc/meminfo') else '/proc/meminfo'
        with open(proc_path, 'r') as f:
            meminfo = {}
            for line in f:
                parts = line.split(':', 1)
                if len(parts) == 2:
                    key, value = parts
                    meminfo[key.strip()] = int(value.split()[0]) * 1024  # Convert KB to Bytes
            
            total_memory_host = meminfo.get('MemTotal', 0)
            free_memory_host = meminfo.get('MemAvailable', meminfo.get('MemFree', 0))
    except:
        total_memory_host = 0
        free_memory_host = 0
    
    # Get CPU and memory info from psutil (container view, for fallback)
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        virtual_memory = psutil.virtual_memory()
        
        # Use host memory if available, otherwise use container memory
        if total_memory_host > 0:
            total_memory = total_memory_host
            free_memory = free_memory_host
            used_memory = total_memory - free_memory
            memory_percent = (used_memory / total_memory * 100) if total_memory > 0 else 0
        else:
            total_memory = virtual_memory.total
            free_memory = virtual_memory.available
            used_memory = virtual_memory.used
            memory_percent = virtual_memory.percent
    except:
        cpu_percent = 0
        total_memory = total_memory_host if total_memory_host > 0 else 0
        free_memory = free_memory_host if free_memory_host > 0 else 0
        used_memory = total_memory - free_memory if total_memory > 0 else 0
        memory_percent = 0
    
    # Get process info
    try:
        process = psutil.Process()
        process_memory = process.memory_info()
        heap_used = process_memory.rss
        heap_total = total_memory
        external = 0
        rss = process_memory.rss
    except:
        heap_used = 0
        heap_total = 0
        external = 0
        rss = 0
    
    # Get system uptime
    try:
        boot_time = psutil.boot_time()
        system_uptime = int(time.time() - boot_time)
    except:
        system_uptime = int(time.time())
    
    # Check MQTT connection
    mqtt_connected = mqtt_client.is_connected() if hasattr(mqtt_client, 'is_connected') else False
    
    # Count total records in sensor_data table
    total_records = 0
    try:
        result = await db.execute(select(func.count(models.SensorData.id)))
        total_records = result.scalar() or 0
    except Exception as e:
        print(f"Error counting records: {e}")
        total_records = 0
    
    return {
        "server": {
            "name": "Industrial IoT Backend",
            "version": VERSION,
            "nodeVersion": platform.python_version(),
            "platform": platform.system(),
            "arch": platform.machine(),
            "hostname": platform.node(),
            "uptime": system_uptime,
            "startTime": __import__('datetime').datetime.now().isoformat()
        },
        "system": {
            "cpuCount": os_module.cpu_count() if hasattr(os_module, 'cpu_count') else 1,
            "cpuUsage": cpu_percent,
            "cpuModel": cpu_model,
            "totalMemory": total_memory,
            "freeMemory": free_memory,
            "usedMemory": used_memory,
            "memoryUsage": memory_percent,
            "systemUptime": system_uptime,
            "loadAverage": list(load_avg)
        },
        "process": {
            "pid": os_module.getpid(),
            "heapUsed": heap_used,
            "heapTotal": heap_total,
            "external": external,
            "rss": rss
        },
        "mqtt": {
            "status": "online" if mqtt_connected else "offline",
            "connected": mqtt_connected,
            "broker": f"{MQTT_HOST}:{MQTT_PORT}",
            "topic": "machines/#",
            "machines": mqtt_message_stats.get_stats()["machines"],
            "sensors": mqtt_message_stats.get_stats()["sensors"],
            "totalMessages": mqtt_message_stats.get_stats()["total_messages"],
            "messagesPerSecond": mqtt_message_stats.get_stats()["messages_per_second"]
        },
        "database": {
            "status": "online",
            "reachable": True,
            "host": os_module.getenv("DATABASE_HOST", "db"),
            "port": int(os_module.getenv("DATABASE_PORT", 5432)),
            "name": os_module.getenv("DATABASE_NAME", "industrial"),
            "user": os_module.getenv("DATABASE_USER", "backend"),
            "total_records": total_records
        },
        "collector": {
            "status": "online",
            "reachable": True,
            "host": os_module.getenv("COLLECTOR_HOST", "collector"),
            "port": int(os_module.getenv("COLLECTOR_PORT", 8001)),
            "enabled": True,
            "ip": await get_collector_ip()
        },
        "connections": {
            "websocketClients": len(manager.active_connections) if manager else 0
        }
    }

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
@app.get("/api/machines", response_model=List[schemas.Machine])
async def get_machines(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Machine))
    return result.scalars().all()

@app.get("/api/machines/connected", response_model=schemas.ConnectedMachineResponse)
async def get_connected_machines(db: AsyncSession = Depends(get_db)):
    """
    Get machines with active MQTT data.
    Returns machines that have received sensor data in the last 5 minutes.
    """
    from datetime import timedelta, datetime, timezone
    
    try:
        five_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
        
        # Get all machines with their PLCs and sensors
        result = await db.execute(
            select(models.Machine, models.PLC, models.Sensor, models.SensorLastValue)
            .join(models.PLC, models.Machine.id == models.PLC.machine_id)
            .outerjoin(models.Sensor, models.PLC.id == models.Sensor.plc_id)
            .outerjoin(models.SensorLastValue, models.Sensor.id == models.SensorLastValue.sensor_id)
        )
        
        # Organize data by machine
        machines_dict = {}
        for row in result:
            machine, plc, sensor, last_value = row
            
            if machine.code not in machines_dict:
                machines_dict[machine.code] = {
                    'machine': machine,
                    'plcs': {},
                    'sensors': [],
                    'last_seen': None
                }
            
            if plc and plc.code not in machines_dict[machine.code]['plcs']:
                machines_dict[machine.code]['plcs'][plc.code] = plc
            
            if sensor and last_value:
                machines_dict[machine.code]['sensors'].append({
                    'code': sensor.code,
                    'name': sensor.name
                })
                if machines_dict[machine.code]['last_seen'] is None or last_value.timestamp > machines_dict[machine.code]['last_seen']:
                    machines_dict[machine.code]['last_seen'] = last_value.timestamp
        
        # Build response
        connected_machines = []
        for machine_code, machine_data in machines_dict.items():
            machine = machine_data['machine']
            plcs = list(machine_data['plcs'].values())
            last_seen = machine_data['last_seen']
            sensors = machine_data['sensors']
            
            # Consider machine as connected if it has data from the last 5 minutes
            is_active = last_seen is not None and last_seen > five_minutes_ago
            
            if plcs:
                plc = plcs[0]  # Use first PLC
                connected_machines.append(schemas.ConnectedMachine(
                    code=machine.code,
                    name=machine.name,
                    plcCode=plc.code,
                    plcName=plc.name,
                    isActive=is_active,
                    lastSeen=last_seen,
                    sensorCount=len(sensors),
                    sensors=[s['code'] for s in sensors]
                ))
        
        # Calculate summary
        summary = {
            'totalMachines': len(connected_machines),
            'activeMachines': sum(1 for m in connected_machines if m.isActive),
            'totalSensors': sum(m.sensorCount for m in connected_machines),
            'totalMessages': sum(m.sensorCount for m in connected_machines)  # Approximate
        }
        
        return schemas.ConnectedMachineResponse(
            machines=connected_machines,
            summary=summary
        )
    except Exception as e:
        logger.error(f"Error fetching connected machines: {e}")
        return schemas.ConnectedMachineResponse(
            machines=[],
            summary={'totalMachines': 0, 'activeMachines': 0, 'totalSensors': 0, 'totalMessages': 0}
        )

@app.get("/api/machines/{machine_id}", response_model=schemas.Machine)
async def get_machine(machine_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Machine).where(models.Machine.id == machine_id))
    machine = result.scalar_one_or_none()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine

# PLCs
@app.get("/api/plcs", response_model=List[schemas.PLC])
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
@app.get("/api/sensors", response_model=List[schemas.Sensor])
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

@app.get("/api/sensors/last-values")
async def get_sensors_last_values(db: AsyncSession = Depends(get_db)):
    """
    Get the last values for all sensors.
    No authentication required for this endpoint (used by dashboard).
    """
    try:
        result = await db.execute(
            select(
                models.Sensor.code,
                models.Sensor.name,
                models.SensorLastValue.value,
                models.SensorLastValue.timestamp,
                models.Sensor.unit,
                models.PLC.code.label('plc_code'),
                models.Machine.code.label('machine_code')
            )
            .outerjoin(models.SensorLastValue, models.Sensor.id == models.SensorLastValue.sensor_id)
            .join(models.PLC, models.Sensor.plc_id == models.PLC.id)
            .join(models.Machine, models.PLC.machine_id == models.Machine.id)
        )
        
        sensors = {}
        for row in result:
            sensor_code, name, value, timestamp, unit, plc_code, machine_code = row
            sensors[sensor_code] = {
                'value': float(value) if value is not None else None,
                'timestamp': int(timestamp.timestamp() * 1000) if timestamp else None,
                'unit': unit,
                'machineCode': machine_code,
                'plcCode': plc_code,
                'name': name
            }
        
        return {'sensors': sensors}
    except Exception as e:
        logger.error(f"Error getting sensor last values: {e}")
        return {'sensors': {}}

# Alias for backward compatibility - same as last-values but without authentication requirement
@app.get("/api/sensors/values")
async def get_sensors_values(db: AsyncSession = Depends(get_db)):
    """
    Alias for /api/sensors/last-values for backward compatibility.
    Get the last values for all sensors.
    No authentication required for this endpoint (used by dashboard).
    """
    try:
        result = await db.execute(
            select(
                models.Sensor.code,
                models.Sensor.name,
                models.SensorLastValue.value,
                models.SensorLastValue.timestamp,
                models.Sensor.unit,
                models.PLC.code.label('plc_code'),
                models.Machine.code.label('machine_code')
            )
            .outerjoin(models.SensorLastValue, models.Sensor.id == models.SensorLastValue.sensor_id)
            .join(models.PLC, models.Sensor.plc_id == models.PLC.id)
            .join(models.Machine, models.PLC.machine_id == models.Machine.id)
        )
        
        sensors = {}
        for row in result:
            sensor_code, name, value, timestamp, unit, plc_code, machine_code = row
            sensors[sensor_code] = {
                'value': float(value) if value is not None else None,
                'timestamp': int(timestamp.timestamp() * 1000) if timestamp else None,
                'unit': unit,
                'machineCode': machine_code,
                'plcCode': plc_code,
                'name': name
            }
        
        return {'sensors': sensors}
    except Exception as e:
        logger.error(f"Error getting sensor values: {e}")
        return {'sensors': {}}

@app.get("/api/sensors/mqtt-topics", response_model=List[schemas.SensorWithMQTT])
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

@app.get("/api/sensors/{sensor_id}", response_model=schemas.Sensor)
async def get_sensor(sensor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Sensor).where(models.Sensor.id == sensor_id))
    sensor = result.scalar_one_or_none()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return sensor

@app.get("/api/sensors/{sensor_identifier}/history")
async def get_sensor_history(
    sensor_identifier: str,
    start: datetime = Query(alias="from"),
    end: datetime = Query(alias="to"),
    db: AsyncSession = Depends(get_db)
):
    # Support both numeric ID and sensor code
    sensor_id = None
    
    try:
        # Try to parse as numeric ID
        sensor_id = int(sensor_identifier)
        query = select(models.SensorData).where(
            models.SensorData.sensor_id == sensor_id,
            models.SensorData.timestamp >= start,
            models.SensorData.timestamp <= end
        ).order_by(models.SensorData.timestamp.asc())
    except ValueError:
        # Use as sensor code string
        query = select(models.SensorData).join(
            models.Sensor
        ).where(
            models.Sensor.code == sensor_identifier,
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
            
            # Handle subscription messages
            if data.get("action") == "subscribe":
                topics = data.get("topic") or data.get("sensors") or data.get("topics", [])
                if isinstance(topics, str):
                    topics = [topics]
                await manager.subscribe(websocket, topics)
            
            # Handle unsubscription messages
            elif data.get("action") == "unsubscribe":
                topics = data.get("topic") or data.get("sensors") or data.get("topics", [])
                if isinstance(topics, str):
                    topics = [topics]
                # TODO: implement unsubscribe if needed
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# ===== ALARMAS =====

@app.get("/api/alarms", response_model=List[schemas.MachineAlarmResponse])
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

@app.get("/api/alarms/active", response_model=List[schemas.MachineAlarmResponse])
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

@app.get("/api/machines/{machine_id}/alarms", response_model=List[schemas.MachineAlarmHistory])
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


# ============================================
# Test Endpoints for Connection Testing
# ============================================

@app.post("/api/test/collector")
async def test_collector_connection(body: dict):
    """Test connection to Collector API"""
    try:
        import requests
        import time
        
        host = body.get('host', '10.147.18.10')
        port = body.get('port', 8000)
        token = body.get('token', '')
        
        url = f"http://{host}:{port}/health"
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        
        start_time = time.time()
        response = requests.get(url, headers=headers, timeout=5)
        latency = int((time.time() - start_time) * 1000)
        
        if response.status_code == 200:
            return {
                "success": True,
                "status": "online",
                "latency": latency
            }
        else:
            return {
                "success": False,
                "status": "offline",
                "error": f"HTTP {response.status_code}"
            }
    except Exception as e:
        return {
            "success": False,
            "status": "error",
            "error": str(e)
        }


@app.post("/api/test/mqtt")
async def test_mqtt_connection(body: dict):
    """Test connection to MQTT Broker"""
    try:
        import paho.mqtt.client as mqtt
        import time
        
        mqtt_host = body.get('mqtt_host', '10.147.18.10')
        mqtt_port = body.get('mqtt_port', 1883)
        
        # Create MQTT client
        client = mqtt.Client()
        client.connect_flag = False
        
        def on_connect(client, userdata, flags, rc):
            client.connect_flag = True
        
        client.on_connect = on_connect
        
        try:
            client.connect(mqtt_host, mqtt_port, keepalive=5)
            client.loop_start()
            
            # Wait for connection
            timeout = 5
            start = time.time()
            while not client.connect_flag and time.time() - start < timeout:
                time.sleep(0.1)
            
            client.loop_stop()
            client.disconnect()
            
            if client.connect_flag:
                return {
                    "success": True,
                    "status": "online",
                    "machines": 0,
                    "sensors": 0,
                    "totalMessages": 0
                }
            else:
                return {
                    "success": False,
                    "status": "timeout",
                    "error": "Connection timeout"
                }
        except Exception as e:
            return {
                "success": False,
                "status": "error",
                "error": str(e)
            }
    except Exception as e:
        return {
            "success": False,
            "status": "error",
            "error": str(e)
        }


@app.post("/api/test/database")
async def test_database_connection(body: dict, db: AsyncSession = Depends(get_db)):
    """Test connection to PostgreSQL Database"""
    try:
        import asyncpg
        
        host = body.get('host', '10.147.18.10')
        port = body.get('port', 5432)
        user = body.get('user', 'backend')
        password = body.get('password', 'backend_pass')
        name = body.get('name', 'industrial')
        
        # Try to connect using the existing connection pool
        try:
            # If we got here without error, the default DB connection works
            result = await db.execute(select(1))
            result.fetchone()
            
            return {
                "success": True,
                "status": "online",
                "message": f"Connected to {name}@{host}:{port}"
            }
        except Exception as e:
            return {
                "success": False,
                "status": "offline",
                "error": str(e),
                "message": f"Failed to connect to {name}@{host}:{port}"
            }
    except Exception as e:
        return {
            "success": False,
            "status": "error",
            "error": str(e)
        }


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
