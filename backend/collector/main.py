import asyncio
import os
import yaml
import json
import logging
import time
import psutil
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import AsyncSessionLocal, engine, Base
import models
import paho.mqtt.client as mqtt
from pymodbus.client import AsyncModbusTcpClient
from pymodbus.payload import BinaryPayloadDecoder
from pymodbus.constants import Endian

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("collector")


# Custom JSON encoder for PostgreSQL types
class PostgresJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def json_dumps(data: dict) -> str:
    """JSON dumps with PostgreSQL type support."""
    return json.dumps(data, cls=PostgresJSONEncoder)


# Database Statistics Tracker
class DBStats:
    def __init__(self):
        self.records_saved = 0
        self.records_failed = 0
        self.total_write_time_ms = 0.0
        self.write_count = 0
        self.last_write_time_ms = 0.0
        self.last_error = None
        self.start_time = datetime.now(timezone.utc)
    
    def record_write(self, duration_ms: float, count: int = 1):
        self.records_saved += count
        self.total_write_time_ms += duration_ms
        self.write_count += 1
        self.last_write_time_ms = duration_ms
    
    def record_error(self, error: str):
        self.records_failed += 1
        self.last_error = error
    
    @property
    def avg_write_time_ms(self) -> float:
        if self.write_count == 0:
            return 0.0
        return self.total_write_time_ms / self.write_count
    
    def to_dict(self) -> dict:
        uptime = (datetime.now(timezone.utc) - self.start_time).total_seconds()
        return {
            "records_saved": self.records_saved,
            "records_failed": self.records_failed,
            "avg_write_time_ms": round(self.avg_write_time_ms, 2),
            "last_write_time_ms": round(self.last_write_time_ms, 2),
            "write_operations": self.write_count,
            "last_error": self.last_error,
            "uptime_seconds": int(uptime)
        }

db_stats = DBStats()

# Config
CONFIG_PATH = os.getenv("CONFIG_PATH", "./config")
SETTINGS_FILE = os.path.join(CONFIG_PATH, "settings.yml")

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

# MQTT Client
mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

def on_connect(client, userdata, flags, reason_code, properties):
    logger.info(f"Connected to MQTT with result code {reason_code}")

mqtt_client.on_connect = on_connect

async def sync_config_files(db: AsyncSession):
    logger.info("Syncing configuration from files...")
    if not os.path.exists(CONFIG_PATH):
        logger.warning(f"Config path {CONFIG_PATH} does not exist.")
        return

    # Load settings to get machine list
    config_files = None
    
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r") as f:
            settings = yaml.safe_load(f)
            if settings and "machines" in settings:
                config_files = settings["machines"]
                if config_files is None:
                    config_files = []
    
    if config_files is None:
        logger.info("No 'machines' key in settings.yml, scanning machines directory...")
        machines_path = os.path.join(CONFIG_PATH, "machines")
        if os.path.exists(machines_path):
            config_files = [os.path.join("machines", f) for f in os.listdir(machines_path) if (f.endswith(".yml") or f.endswith(".yaml"))]
        else:
            config_files = [f for f in os.listdir(CONFIG_PATH) if (f.endswith(".yml") or f.endswith(".yaml")) and f != "settings.yml"]
    elif not config_files:
        logger.info("Machines list is empty in settings.yml.")

    # Track codes from configuration files
    config_machine_codes = set()
    config_plc_codes = set()
    config_sensor_codes = set()

    for filename in config_files:
        filepath = os.path.join(CONFIG_PATH, filename)
        if not os.path.exists(filepath):
            logger.warning(f"Configuration file {filename} not found.")
            continue
            
        with open(filepath, "r") as f:
            try:
                config = yaml.safe_load(f)
                
                # Sync Machine
                machine_conf = config.get("machine")
                config_machine_codes.add(machine_conf["code"])
                
                result = await db.execute(select(models.Machine).where(models.Machine.code == machine_conf["code"]))
                machine = result.scalar_one_or_none()
                
                if not machine:
                    machine = models.Machine(
                        code=machine_conf["code"],
                        name=machine_conf["name"],
                        description=machine_conf.get("description")
                    )
                    db.add(machine)
                    await db.commit()
                    await db.refresh(machine)
                
                # Sync PLC
                plc_conf = config.get("plc")
                config_plc_codes.add(plc_conf["code"])
                
                result = await db.execute(select(models.PLC).where(models.PLC.code == plc_conf["code"]))
                plc = result.scalar_one_or_none()
                
                if not plc:
                    plc = models.PLC(
                        machine_id=machine.id,
                        code=plc_conf["code"],
                        name=plc_conf["name"],
                        protocol=plc_conf["protocol"],
                        ip_address=plc_conf.get("ip_address"),
                        port=plc_conf.get("port"),
                        unit_id=plc_conf.get("unit_id"),
                        poll_interval_s=plc_conf.get("poll_interval_s", 1),
                        enabled=plc_conf.get("enabled", True)
                    )
                    db.add(plc)
                    await db.commit()
                    await db.refresh(plc)
                else:
                    # Update fields
                    plc.ip_address = plc_conf.get("ip_address")
                    plc.port = plc_conf.get("port")
                    plc.poll_interval_s = plc_conf.get("poll_interval_s", 1)
                    # Only update enabled if explicitly set in file
                    if "enabled" in plc_conf:
                        plc.enabled = plc_conf["enabled"]
                    await db.commit()

                # Sync Sensors
                sensors_conf = config.get("sensors", [])
                for sensor_conf in sensors_conf:
                    config_sensor_codes.add(sensor_conf["code"])
                    
                    # Prepare metadata with value_map if present
                    metadata = None
                    if sensor_conf.get("value_map"):
                        metadata = {"value_map": sensor_conf["value_map"]}
                    
                    result = await db.execute(select(models.Sensor).where(models.Sensor.code == sensor_conf["code"]))
                    sensor = result.scalar_one_or_none()
                    
                    if not sensor:
                        sensor = models.Sensor(
                            plc_id=plc.id,
                            code=sensor_conf["code"],
                            name=sensor_conf["name"],
                            type=sensor_conf["type"],
                            unit=sensor_conf["unit"],
                            address=sensor_conf["address"],
                            function_code=sensor_conf["function_code"],
                            scale_factor=sensor_conf.get("scale_factor", 1.0),
                            offset=sensor_conf.get("offset", 0.0),
                            data_type=sensor_conf.get("data_type", "int16"),
                            precision=sensor_conf.get("precision", 2),
                            swap=sensor_conf.get("swap"),
                            is_discrete=sensor_conf.get("is_discrete", False),
                            display_format=sensor_conf.get("display_format"),
                            metadata_info=metadata
                        )
                        db.add(sensor)
                        await db.commit()
                    else:
                        sensor.type = sensor_conf["type"]
                        sensor.data_type = sensor_conf.get("data_type", "int16")
                        sensor.precision = sensor_conf.get("precision", 2)
                        sensor.swap = sensor_conf.get("swap")
                        sensor.display_format = sensor_conf.get("display_format")
                        sensor.metadata_info = metadata
                        await db.commit()
                
            except Exception as e:
                logger.error(f"Error processing {filename}: {e}")

    # Remove PLCs, Machines, and Sensors that are not in the configuration
    # First, disable PLCs not in config (to stop monitoring)
    result = await db.execute(select(models.PLC))
    all_plcs = result.scalars().all()
    for plc in all_plcs:
        if plc.code not in config_plc_codes:
            if plc.enabled:
                logger.info(f"🗑️ Disabling PLC '{plc.code}' (not in configuration)")
                plc.enabled = False
                await db.commit()
    
    # Delete sensors not in config
    result = await db.execute(select(models.Sensor))
    all_sensors = result.scalars().all()
    for sensor in all_sensors:
        if sensor.code not in config_sensor_codes:
            logger.info(f"🗑️ Removing sensor '{sensor.code}' (not in configuration)")
            # Delete related data first (SensorData, SensorLastValue)
            await db.execute(
                models.SensorData.__table__.delete().where(models.SensorData.sensor_id == sensor.id)
            )
            await db.execute(
                models.SensorLastValue.__table__.delete().where(models.SensorLastValue.sensor_id == sensor.id)
            )
            await db.delete(sensor)
            await db.commit()
    
    # Delete PLCs not in config (after sensors are deleted)
    result = await db.execute(select(models.PLC))
    all_plcs = result.scalars().all()
    for plc in all_plcs:
        if plc.code not in config_plc_codes:
            logger.info(f"🗑️ Removing PLC '{plc.code}' (not in configuration)")
            # Delete PLCStatus if exists
            await db.execute(
                models.PLCStatus.__table__.delete().where(models.PLCStatus.plc_id == plc.id)
            )
            await db.delete(plc)
            await db.commit()
    
    # Delete Machines not in config (after PLCs are deleted)
    result = await db.execute(select(models.Machine))
    all_machines = result.scalars().all()
    for machine in all_machines:
        if machine.code not in config_machine_codes:
            logger.info(f"🗑️ Removing machine '{machine.code}' (not in configuration)")
            await db.delete(machine)
            await db.commit()
    
    logger.info(f"✅ Sync complete. Active: {len(config_machine_codes)} machines, {len(config_plc_codes)} PLCs, {len(config_sensor_codes)} sensors")

async def get_active_plcs(db: AsyncSession):
    plcs_to_monitor = []
    result = await db.execute(select(models.PLC).where(models.PLC.enabled == True))
    enabled_plcs = result.scalars().all()
    
    for plc in enabled_plcs:
        # Fetch Machine
        result_m = await db.execute(select(models.Machine).where(models.Machine.id == plc.machine_id))
        machine = result_m.scalar_one()
        
        # Fetch Sensors
        result_s = await db.execute(select(models.Sensor).where(models.Sensor.plc_id == plc.id))
        sensors = result_s.scalars().all()
        
        plcs_to_monitor.append({
            "plc": plc,
            "sensors": sensors,
            "machine_code": machine.code
        })
    return plcs_to_monitor

def get_config_mtime():
    mtime = 0
    if os.path.exists(SETTINGS_FILE):
        mtime = max(mtime, os.path.getmtime(SETTINGS_FILE))
    
    if os.path.exists(CONFIG_PATH):
        for f in os.listdir(CONFIG_PATH):
            if f.endswith(".yml") or f.endswith(".yaml"):
                mtime = max(mtime, os.path.getmtime(os.path.join(CONFIG_PATH, f)))
    return mtime

async def handle_sensor_alarm(db: AsyncSession, sensor, machine, sensor_conf: dict, current_value: float, timestamp: datetime):
    """
    Detectar y guardar alarmas cuando sensores marcados como is_alarm cambian de estado.
    """
    try:
        # Revisar si el sensor está marcado como alarma
        is_alarm = sensor_conf.get("is_alarm", False)
        if not is_alarm:
            return
        
        alarm_code = sensor_conf.get("code")
        alarm_name = sensor_conf.get("name")
        severity = sensor_conf.get("severity", "high")
        color = sensor_conf.get("color", "#FF0000")
        
        # Obtener el valor anterior del sensor
        result = await db.execute(
            select(models.SensorLastValue).where(models.SensorLastValue.sensor_id == sensor.id)
        )
        last_value_record = result.scalar_one_or_none()
        prev_value = last_value_record.value if last_value_record else None
        
        # Detectar transición de estado (0->1 = activación, 1->0 = desactivación)
        if prev_value is not None:
            prev_alarm_active = prev_value > 0
            curr_alarm_active = current_value > 0
            
            if prev_alarm_active != curr_alarm_active:
                if curr_alarm_active:
                    # Alarma se ACTIVÓ (0->1)
                    existing_alarm = await db.execute(
                        select(models.MachineAlarm).where(
                            models.MachineAlarm.sensor_id == sensor.id,
                            models.MachineAlarm.alarm_code == alarm_code,
                            models.MachineAlarm.status == 1,
                            models.MachineAlarm.timestamp_off == None
                        )
                    )
                    if not existing_alarm.scalar_one_or_none():
                        # Crear nueva alarma
                        new_alarm = models.MachineAlarm(
                            machine_id=machine.id,
                            sensor_id=sensor.id,
                            alarm_code=alarm_code,
                            alarm_name=alarm_name,
                            severity=severity,
                            status=1,
                            color=color,
                            timestamp_on=timestamp,
                            timestamp_off=None
                        )
                        db.add(new_alarm)
                        logger.warning(f"🚨 ALARM TRIGGERED: {alarm_name} ({machine.code}) at {timestamp.isoformat()}")
                else:
                    # Alarma se DESACTIVÓ (1->0)
                    active_alarm = await db.execute(
                        select(models.MachineAlarm).where(
                            models.MachineAlarm.sensor_id == sensor.id,
                            models.MachineAlarm.alarm_code == alarm_code,
                            models.MachineAlarm.status == 1,
                            models.MachineAlarm.timestamp_off == None
                        )
                    )
                    alarm_to_close = active_alarm.scalar_one_or_none()
                    if alarm_to_close:
                        alarm_to_close.status = 0
                        alarm_to_close.timestamp_off = timestamp
                        logger.info(f"✅ ALARM CLEARED: {alarm_name} ({machine.code}) at {timestamp.isoformat()}")
    
    except Exception as e:
        logger.error(f"Error handling sensor alarm for {sensor.code}: {e}")

async def read_group_loop(group_key, plcs_in_group):
    ip, port = group_key
    logger.info(f"Starting shared connection loop for {ip}:{port} (handling {len(plcs_in_group)} logical PLCs)")
    
    client = AsyncModbusTcpClient(ip, port=port)
    
    while True:
        try:
            if not client.connected:
                logger.info(f"🔌 Attempting to connect to {ip}:{port}...")
                await client.connect()
                if client.connected:
                    logger.info(f"✅ Successfully connected to {ip}:{port}")
            
            if not client.connected:
                logger.error(f"❌ Failed to connect to {ip}:{port}. Retrying in 60 seconds...")
                await asyncio.sleep(60)
                continue

            # Iterate over each logical PLC in this group
            for plc_data in plcs_in_group:
                plc = plc_data["plc"]
                sensors = plc_data["sensors"]
                machine_code = plc_data["machine_code"]
                
                readings_log = []
                records_to_save = 0
                
                # Open DB session once per PLC poll to reduce overhead
                try:
                    async with AsyncSessionLocal() as db:
                        for sensor in sensors:
                            value = None
                            quality = 0
                            raw_value = None
                            
                            try:
                                if sensor.function_code == 3: # Holding Register
                                    count = 2 if sensor.data_type in ["float32", "uint32"] else 1
                                    rr = await client.read_holding_registers(sensor.address, count, slave=plc.unit_id)
                                    if not rr.isError():
                                        # Default Endianness
                                        byte_order = Endian.BIG
                                        word_order = Endian.BIG
                                        
                                        if sensor.swap == "word":
                                            word_order = Endian.LITTLE
                                        
                                        decoder = BinaryPayloadDecoder.fromRegisters(rr.registers, byteorder=byte_order, wordorder=word_order)
                                        
                                        if sensor.data_type == "float32":
                                            raw_value = decoder.decode_32bit_float()
                                        elif sensor.data_type == "uint32":
                                            raw_value = decoder.decode_32bit_uint()
                                        else:
                                            raw_value = decoder.decode_16bit_int()
                                            
                                        value = (raw_value * sensor.scale_factor) + sensor.offset
                                        
                                        if sensor.precision is not None:
                                            value = round(value, sensor.precision)
                                    else:
                                        quality = 2 # Error
                                        # logger.warning(f"Modbus error reading sensor {sensor.code} on PLC {plc.code}")
                                elif sensor.function_code == 1: # Coil
                                    rr = await client.read_coils(sensor.address, 1, slave=plc.unit_id)
                                    if not rr.isError():
                                        raw_value = 1 if rr.bits[0] else 0
                                        value = float(raw_value)
                                    else:
                                        quality = 2
                                        # logger.warning(f"Modbus error reading sensor {sensor.code} on PLC {plc.code}")
                                
                                if value is not None:
                                    timestamp = datetime.now(timezone.utc)
                                    
                                    # Determine icon based on type
                                    icon = "📊"
                                    if "temp" in sensor.type.lower(): icon = "🌡️"
                                    elif "rpm" in sensor.type.lower(): icon = "⚙️"
                                    elif "state" in sensor.type.lower(): icon = "🟢" if value > 0 else "🔴"
                                    elif "pressure" in sensor.type.lower(): icon = "💨"
                                    elif sensor.type.lower() == "boolean": icon = "🟢" if value > 0 else "🔴"
                                    elif sensor.type.lower() == "program": icon = "📋"
                                    
                                    # Format display value based on display_format
                                    display_value = value
                                    if sensor.display_format == "boolean":
                                        display_value = "ON" if value > 0 else "OFF"
                                    elif sensor.display_format == "mapped" and sensor.metadata_info:
                                        value_map = sensor.metadata_info.get("value_map", {})
                                        # Convert value to int for lookup (keys in YAML are ints)
                                        int_value = int(value)
                                        display_value = value_map.get(str(int_value), value_map.get(int_value, f"#{int_value}"))
                                    
                                    readings_log.append(f"{icon} {sensor.name}: {display_value}{sensor.unit}")
                                    
                                    # Publish MQTT
                                    topic = f"machines/{machine_code}/{plc.code}/{sensor.code}"
                                    payload = {
                                        "sensor_code": sensor.code,
                                        "timestamp": timestamp.isoformat(),
                                        "value": value,
                                        "display_value": str(display_value),
                                        "raw_value": raw_value,
                                        "quality": quality,
                                        "unit": sensor.unit,
                                        "machine": machine_code,
                                        "plc": plc.code
                                    }
                                    mqtt_client.publish(topic, json.dumps(payload))
                                    
                                    # Save to DB
                                    # Sanitize raw_value for Integer column
                                    safe_raw_value = raw_value
                                    if safe_raw_value is not None:
                                        try:
                                            # Check if it fits in 4-byte signed integer
                                            if not (-2147483648 <= safe_raw_value <= 2147483647):
                                                safe_raw_value = None
                                            else:
                                                safe_raw_value = int(safe_raw_value)
                                        except Exception:
                                            safe_raw_value = None

                                    sensor_data = models.SensorData(
                                        sensor_id=sensor.id,
                                        timestamp=timestamp,
                                        value=value,
                                        quality=quality,
                                        raw_value=safe_raw_value
                                    )
                                    db.add(sensor_data)
                                    
                                    # Update Last Value
                                    result = await db.execute(select(models.SensorLastValue).where(models.SensorLastValue.sensor_id == sensor.id))
                                    last_val = result.scalar_one_or_none()
                                    if last_val:
                                        last_val.timestamp = timestamp
                                        last_val.value = value
                                        last_val.quality = quality
                                    else:
                                        last_val = models.SensorLastValue(
                                            sensor_id=sensor.id,
                                            timestamp=timestamp,
                                            value=value,
                                            quality=quality
                                        )
                                    db.add(last_val)
                                    records_to_save += 1
                                    
                                    # Handle alarms if this sensor is marked as is_alarm
                                    await handle_sensor_alarm(db, sensor, machine, sensor_conf, value, timestamp)

                            except Exception as e:
                                # import traceback
                                # logger.error(f"Error reading sensor {sensor.code}: {e!r}")
                                quality = 2
                                db_stats.record_error(str(e))
                    
                        # Commit all changes for this PLC at once (outside sensor loop, inside db session)
                        if records_to_save > 0:
                            write_start = time.time()
                            await db.commit()
                            write_duration_ms = (time.time() - write_start) * 1000
                            db_stats.record_write(write_duration_ms, records_to_save)
                        else:
                            await db.commit()
                except Exception as db_error:
                    logger.warning(f"⚠️ Database error for PLC {plc.code}, skipping this cycle: {db_error}")
                    db_stats.record_error(str(db_error))
                    # Session will be rolled back automatically when exiting async with block
                
                if readings_log:
                    logger.info(f"📡 [{plc.name}] {' | '.join(readings_log)}")

            # Sleep interval (using the first PLC's interval as reference, or default 1s)
            interval = plcs_in_group[0]["plc"].poll_interval_s
            await asyncio.sleep(interval)
            
        except Exception as e:
            logger.error(f"❌ Error in group loop {ip}:{port}: {e}. Retrying in 60 seconds...")
            await asyncio.sleep(60)

def get_system_resources() -> dict:
    """Get system resource usage (CPU, memory, disk)."""
    try:
        # CPU
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()
        
        # Memory
        memory = psutil.virtual_memory()
        
        # Disk (root partition)
        disk = psutil.disk_usage('/')
        
        # Network I/O
        net_io = psutil.net_io_counters()
        
        # Process info (current collector process)
        process = psutil.Process()
        process_memory = process.memory_info()
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cpu": {
                "percent": cpu_percent,
                "count": cpu_count,
                "freq_mhz": round(cpu_freq.current, 2) if cpu_freq else None
            },
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2),
                "percent": memory.percent
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "percent": disk.percent
            },
            "network": {
                "bytes_sent_mb": round(net_io.bytes_sent / (1024**2), 2),
                "bytes_recv_mb": round(net_io.bytes_recv / (1024**2), 2),
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv
            },
            "collector_process": {
                "memory_mb": round(process_memory.rss / (1024**2), 2),
                "cpu_percent": process.cpu_percent()
            }
        }
    except Exception as e:
        logger.error(f"Error getting system resources: {e}")
        return {"error": str(e)}


async def get_postgresql_stats() -> dict:
    """Get PostgreSQL statistics and performance metrics."""
    stats = {
        "status": "offline",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "connections": {},
        "database_size": {},
        "tables": {},
        "performance": {},
        "replication": {},
        "locks": {}
    }
    
    try:
        async with AsyncSessionLocal() as db:
            # Test connection
            await db.execute(text("SELECT 1"))
            stats["status"] = "online"
            
            # Get active connections
            result = await db.execute(text("""
                SELECT 
                    count(*) as total,
                    count(*) FILTER (WHERE state = 'active') as active,
                    count(*) FILTER (WHERE state = 'idle') as idle
                FROM pg_stat_activity 
                WHERE datname = current_database()
            """))
            row = result.fetchone()
            if row:
                stats["connections"] = {
                    "total": row[0],
                    "active": row[1],
                    "idle": row[2]
                }
            
            # Get database size
            result = await db.execute(text("""
                SELECT pg_database_size(current_database()) as size_bytes
            """))
            row = result.fetchone()
            if row:
                size_bytes = row[0]
                stats["database_size"] = {
                    "bytes": size_bytes,
                    "mb": round(size_bytes / (1024 * 1024), 2),
                    "gb": round(size_bytes / (1024 * 1024 * 1024), 4)
                }
            
            # Get table statistics
            result = await db.execute(text("""
                SELECT 
                    relname as table_name,
                    n_live_tup as row_count
                FROM pg_stat_user_tables
                WHERE relname IN ('sensor_data', 'sensors', 'plcs', 'machines', 'sensor_last_value')
                ORDER BY n_live_tup DESC
            """))
            rows = result.fetchall()
            stats["tables"] = {row[0]: row[1] for row in rows}
            
            # Get insert/update rates from pg_stat_user_tables
            result = await db.execute(text("""
                SELECT 
                    SUM(n_tup_ins) as total_inserts,
                    SUM(n_tup_upd) as total_updates,
                    SUM(n_tup_del) as total_deletes
                FROM pg_stat_user_tables
            """))
            row = result.fetchone()
            if row:
                stats["performance"]["total_inserts"] = row[0] or 0
                stats["performance"]["total_updates"] = row[1] or 0
                stats["performance"]["total_deletes"] = row[2] or 0
            
            # Get cache hit ratio
            result = await db.execute(text("""
                SELECT 
                    CASE WHEN blks_hit + blks_read = 0 THEN 0
                    ELSE round(100.0 * blks_hit / (blks_hit + blks_read), 2)
                    END as cache_hit_ratio
                FROM pg_stat_database 
                WHERE datname = current_database()
            """))
            row = result.fetchone()
            if row:
                stats["performance"]["cache_hit_ratio"] = float(row[0]) if row[0] else 0.0
            
            # Get active locks count
            result = await db.execute(text("""
                SELECT 
                    count(*) as total_locks,
                    count(*) FILTER (WHERE granted = false) as waiting_locks
                FROM pg_locks
            """))
            row = result.fetchone()
            if row:
                stats["locks"] = {
                    "total": row[0] or 0,
                    "waiting": row[1] or 0
                }
            
            # Get transaction statistics
            result = await db.execute(text("""
                SELECT 
                    xact_commit as commits,
                    xact_rollback as rollbacks,
                    tup_returned as rows_returned,
                    tup_fetched as rows_fetched,
                    tup_inserted as rows_inserted,
                    tup_updated as rows_updated,
                    tup_deleted as rows_deleted
                FROM pg_stat_database 
                WHERE datname = current_database()
            """))
            row = result.fetchone()
            if row:
                stats["transactions"] = {
                    "commits": row[0] or 0,
                    "rollbacks": row[1] or 0,
                    "rows_returned": row[2] or 0,
                    "rows_fetched": row[3] or 0,
                    "rows_inserted": row[4] or 0,
                    "rows_updated": row[5] or 0,
                    "rows_deleted": row[6] or 0
                }
            
            # Get PostgreSQL version
            result = await db.execute(text("SELECT version()"))
            row = result.fetchone()
            if row:
                stats["version"] = row[0].split()[1] if row[0] else "unknown"
            
            # Get uptime
            result = await db.execute(text("""
                SELECT 
                    EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time()))::int as uptime_seconds
                FROM pg_postmaster_start_time()
            """))
            row = result.fetchone()
            if row:
                uptime_secs = row[0] or 0
                stats["uptime"] = {
                    "seconds": uptime_secs,
                    "hours": round(uptime_secs / 3600, 2),
                    "days": round(uptime_secs / 86400, 2)
                }
                
    except Exception as e:
        stats["status"] = "error"
        stats["error"] = str(e)
        logger.error(f"Error getting PostgreSQL stats: {e}")
    
    return stats

async def publish_system_status():
    """Publish system status including PostgreSQL metrics and system resources to MQTT."""
    try:
        # Get PostgreSQL stats
        pg_stats = await get_postgresql_stats()
        
        # Get system resources
        resources = get_system_resources()
        
        # Get collector stats
        collector_stats = db_stats.to_dict()
        
        # Build comprehensive status payload
        status_payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "collector": {
                "status": "online",
                "stats": collector_stats
            },
            "postgresql": pg_stats,
            "mqtt": {
                "status": "online" if mqtt_client.is_connected() else "offline",
                "host": MQTT_HOST,
                "port": MQTT_PORT
            },
            "resources": resources
        }
        
        # Publish to MQTT topics (using custom encoder for Decimal types)
        mqtt_client.publish("system/status", json_dumps(status_payload), retain=True)
        mqtt_client.publish("system/postgresql", json_dumps(pg_stats), retain=True)
        mqtt_client.publish("system/collector", json_dumps(collector_stats), retain=True)
        mqtt_client.publish("system/resources", json_dumps(resources), retain=True)
        
        # Log summary
        cpu_pct = resources.get("cpu", {}).get("percent", "N/A")
        mem_pct = resources.get("memory", {}).get("percent", "N/A")
        disk_pct = resources.get("disk", {}).get("percent", "N/A")
        
        logger.info(
            f"📊 System status published - "
            f"DB: {pg_stats['status']} | "
            f"CPU: {cpu_pct}% | "
            f"MEM: {mem_pct}% | "
            f"DISK: {disk_pct}% | "
            f"Records: {collector_stats['records_saved']}"
        )
        
    except Exception as e:
        logger.error(f"Error publishing system status: {e}")

async def check_services():
    """Check if critical services (DB, MQTT) are reachable."""
    logger.info("🔍 Checking critical services...")
    
    # Check MQTT
    try:
        if not mqtt_client.is_connected():
            logger.warning("⚠️ MQTT not connected. Attempting to reconnect...")
            mqtt_client.reconnect()
        else:
            logger.info("✅ MQTT Service: Online")
    except Exception as e:
        logger.error(f"❌ MQTT Service: Error ({e})")

    # Check DB and publish stats
    pg_stats = await get_postgresql_stats()
    if pg_stats["status"] == "online":
        logger.info(f"✅ Database Service: Online (Size: {pg_stats['database_size'].get('mb', 0)} MB)")
    else:
        logger.error(f"❌ Database Service: {pg_stats.get('error', 'Unknown error')}")

async def main():
    # Version
    VERSION = "0.8"
    logger.info(f"🚀 Industrial IoT Collector v{VERSION}")
    
    # Wait for DB
    logger.info("⏳ Waiting for services to initialize...")
    await asyncio.sleep(5) 
    
    # Connect MQTT
    try:
        mqtt_client.connect(MQTT_HOST, MQTT_PORT, 60)
        mqtt_client.loop_start()
        logger.info(f"✅ MQTT Client started on {MQTT_HOST}:{MQTT_PORT}")
    except Exception as e:
        logger.error(f"❌ Failed to connect to MQTT: {e}")

    # Initial Service Check
    await check_services()
    
    # Publish initial system status
    await publish_system_status()

    async with AsyncSessionLocal() as db:
        # Create tables if not exist (Collector might run before API)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
        # Initial sync
        await sync_config_files(db)
    
    running_tasks = {} # key -> task
    group_signatures = {} # key -> set of plc codes
    last_config_mtime = get_config_mtime()
    last_status_publish = time.time()
    status_publish_interval = 30  # Publish system status every 30 seconds
    
    while True:
        try:
            # Publish system status periodically
            if time.time() - last_status_publish >= status_publish_interval:
                await publish_system_status()
                last_status_publish = time.time()
            
            # 1. Check for file changes
            current_mtime = get_config_mtime()
            if current_mtime > last_config_mtime:
                logger.info("📂 Configuration change detected. Syncing...")
                async with AsyncSessionLocal() as db:
                    await sync_config_files(db)
                last_config_mtime = current_mtime
            
            # 2. Get active PLCs from DB
            async with AsyncSessionLocal() as db:
                plcs = await get_active_plcs(db)
            
            # 3. Group PLCs
            new_plc_groups = {}
            for plc_data in plcs:
                plc = plc_data["plc"]
                key = (plc.ip_address, plc.port)
                if key not in new_plc_groups:
                    new_plc_groups[key] = []
                new_plc_groups[key].append(plc_data)
            
            # 4. Manage Tasks
            current_keys = set(running_tasks.keys())
            new_keys = set(new_plc_groups.keys())
            
            # Stop removed groups
            for key in current_keys - new_keys:
                logger.info(f"🛑 Stopping monitor for {key}")
                running_tasks[key].cancel()
                del running_tasks[key]
                del group_signatures[key]
            
            # Start new groups
            for key in new_keys - current_keys:
                logger.info(f"🚀 Starting monitor for {key}")
                running_tasks[key] = asyncio.create_task(read_group_loop(key, new_plc_groups[key]))
                group_signatures[key] = {p["plc"].code for p in new_plc_groups[key]}
            
            # Check existing groups for changes
            for key in current_keys & new_keys:
                new_signature = {p["plc"].code for p in new_plc_groups[key]}
                old_signature = group_signatures.get(key, set())
                
                # Also check if poll_interval changed? 
                # For now, just checking if PLCs added/removed from group.
                # If poll_interval changed, it might not be caught here unless we include it in signature.
                # Let's include poll_interval in signature.
                new_signature_detailed = {(p["plc"].code, p["plc"].poll_interval_s) for p in new_plc_groups[key]}
                old_signature_detailed = group_signatures.get(key, set()) # This will be mismatch if I change structure
                
                # Wait, I stored set of codes. Let's just restart if codes change.
                # If poll_interval changes, the user might need to restart or we can be smarter.
                # Let's stick to codes for now to avoid constant restarts on minor things if I don't track them well.
                # Actually, if I change poll_interval in DB, I want it to apply.
                # So I should track it.
                
                # Let's use a string signature of sorted codes + intervals
                def get_sig(group):
                    return sorted([(p["plc"].code, p["plc"].poll_interval_s) for p in group])
                
                new_sig = get_sig(new_plc_groups[key])
                # I need to store the sig, not just codes.
                # But I initialized group_signatures with set of codes above. Let's fix that.
                
                # Correct logic:
                # If key is new, start it.
                # If key exists, compare signature.
                
                # I'll just rewrite the loop logic below cleanly.
                pass

            # Re-implementing the loop logic cleanly
            for key in new_keys:
                new_group = new_plc_groups[key]
                new_sig = sorted([(p["plc"].code, p["plc"].poll_interval_s) for p in new_group])
                
                if key not in running_tasks:
                    # New
                    logger.info(f"🚀 Starting monitor for {key}")
                    running_tasks[key] = asyncio.create_task(read_group_loop(key, new_group))
                    group_signatures[key] = new_sig
                else:
                    # Existing, check signature
                    old_sig = group_signatures.get(key)
                    if old_sig != new_sig:
                        logger.info(f"🔄 Restarting monitor for {key} (Configuration changed)")
                        running_tasks[key].cancel()
                        # Wait a bit? No, create_task schedules it.
                        # Ideally await the cancel?
                        try:
                            await running_tasks[key]
                        except asyncio.CancelledError:
                            pass
                        
                        running_tasks[key] = asyncio.create_task(read_group_loop(key, new_group))
                        group_signatures[key] = new_sig
            
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
        
        await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(main())
