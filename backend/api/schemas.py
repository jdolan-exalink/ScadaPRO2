from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

# ============= MACHINE CONFIGURATION FILE SCHEMAS =============
class MachineYMLBase(BaseModel):
    """Base schema for machine YAML configuration"""
    machine_code: str = Field(..., description="Machine identifier code (e.g., 'sec21')")
    machine_name: str = Field(..., description="Human readable machine name")


class MachineYMLCreate(MachineYMLBase):
    """Schema for creating a new machine YAML file"""
    config: Dict[str, Any] = Field(..., description="Full YAML configuration as dict")


class MachineYMLUpdate(BaseModel):
    """Schema for updating an existing machine YAML file"""
    config: Dict[str, Any] = Field(..., description="Full YAML configuration as dict")


class MachineYMLResponse(MachineYMLBase):
    """Schema for machine YAML file response"""
    filename: str
    data: Dict[str, Any]


class MachineSettingsItem(BaseModel):
    """Single item in settings.yml machines list"""
    path: str = Field(..., description="Path to machine YAML file (e.g., 'machines/sec21.yml')")
    code: str = Field(..., description="Machine code extracted from path")
    enabled: bool = Field(..., description="Whether machine is enabled (not commented out)")


class MachineSettingsUpdate(BaseModel):
    """Schema for updating machine status in settings.yml"""
    path: str = Field(..., description="Path to machine YAML file")
    enabled: bool = Field(..., description="Enable or disable the machine")


class MachineSettingsList(BaseModel):
    """Full list of machines in settings.yml"""
    machines: List[MachineSettingsItem]


# ============= OLD MACHINE SCHEMAS (Database) =============
class MachineBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None

class MachineCreate(MachineBase):
    pass

class Machine(MachineBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# PLC Schemas
class PLCBase(BaseModel):
    code: str
    name: str
    protocol: str
    ip_address: Optional[str] = None
    port: Optional[int] = None
    unit_id: Optional[int] = None
    poll_interval_s: int = 1
    enabled: bool = True

class PLCCreate(PLCBase):
    machine_id: int

class PLC(PLCBase):
    id: int
    machine_id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class PLCUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    unit_id: Optional[int] = None
    poll_interval_s: Optional[int] = None
    enabled: Optional[bool] = None

# Sensor Schemas
class SensorBase(BaseModel):
    code: str
    name: str
    type: str
    unit: Optional[str] = None
    address: int
    function_code: int
    scale_factor: float = 1.0
    offset: float = 0.0
    data_type: str = "int16"
    precision: int = 2
    swap: Optional[str] = None
    is_discrete: bool = False

class SensorCreate(SensorBase):
    plc_id: int

class Sensor(SensorBase):
    id: int
    plc_id: int
    display_format: Optional[str] = None
    metadata_info: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Sensor with MQTT topic info for frontend
class SensorWithMQTT(BaseModel):
    id: int
    code: str
    name: str
    type: str
    unit: Optional[str] = None
    display_format: Optional[str] = None
    value_map: Optional[Dict[str, str]] = None
    mqtt_topic: str
    machine_code: str
    machine_name: str
    plc_code: str

    class Config:
        from_attributes = True

# Sensor Data Schemas
class SensorDataPoint(BaseModel):
    timestamp: datetime
    value: float

class SensorData(BaseModel):
    sensor_code: str
    timestamp: datetime
    value: float
    unit: Optional[str]
    quality: int = 0

class ConfigurationExport(BaseModel):
    assets: List[Machine]
    sensors: List[Sensor]

# System Log Schemas
class SystemLogBase(BaseModel):
    level: str
    source: str
    message: str
    details: Optional[Dict[str, Any]] = None

class SystemLogCreate(SystemLogBase):
    pass

class SystemLog(SystemLogBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# Machine Configuration Management
class MachineConfigFile(BaseModel):
    filename: str
    enabled: bool

class MachineConfigUpdate(BaseModel):
    files: List[MachineConfigFile]

# Machine Alarm Schemas
class MachineAlarmBase(BaseModel):
    alarm_code: str
    alarm_name: str
    severity: str  # high, critical, medium, low
    color: str = "#FF0000"

class MachineAlarmCreate(MachineAlarmBase):
    machine_id: int
    sensor_id: Optional[int] = None
    status: int = 1
    timestamp_on: Optional[datetime] = None
    timestamp_off: Optional[datetime] = None

class MachineAlarm(MachineAlarmBase):
    id: int
    machine_id: int
    sensor_id: Optional[int] = None
    status: int  # 1 = activa, 0 = inactiva
    timestamp_on: datetime
    timestamp_off: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class MachineAlarmResponse(MachineAlarm):
    """Alarma con información de máquina y sensor relacionados"""
    machine_code: Optional[str] = None
    machine_name: Optional[str] = None
    sensor_code: Optional[str] = None
    sensor_name: Optional[str] = None

class MachineAlarmHistory(BaseModel):
    """Historial de activaciones/desactivaciones de una alarma"""
    id: int
    alarm_code: str
    alarm_name: str
    severity: str
    timestamp_on: datetime
    timestamp_off: Optional[datetime] = None
    is_active: bool  # True si timestamp_off es NULL

    class Config:
        from_attributes = True

# Connected Machines for MQTT Live Data
class ConnectedMachineSensor(BaseModel):
    code: str
    name: str
    last_update: Optional[datetime] = None

class ConnectedMachine(BaseModel):
    code: str
    name: str
    plcCode: str
    plcName: str
    isActive: bool
    lastSeen: Optional[datetime] = None
    sensorCount: int
    sensors: list[str] = []

class ConnectedMachineResponse(BaseModel):
    machines: list[ConnectedMachine]
    summary: dict
