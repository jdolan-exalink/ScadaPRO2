from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, JSON, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import datetime

class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    plcs = relationship("PLC", back_populates="machine")

class PLC(Base):
    __tablename__ = "plcs"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    protocol = Column(String, nullable=False) # modbus_tcp, modbus_rtu
    ip_address = Column(String, nullable=True)
    port = Column(Integer, nullable=True)
    unit_id = Column(Integer, nullable=True)
    serial_port = Column(String, nullable=True)
    baudrate = Column(Integer, nullable=True)
    parity = Column(String, nullable=True)
    stopbits = Column(Integer, nullable=True)
    databits = Column(Integer, nullable=True)
    poll_interval_s = Column(Integer, default=1)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    machine = relationship("Machine", back_populates="plcs")
    sensors = relationship("Sensor", back_populates="plc")
    status = relationship("PLCStatus", back_populates="plc", uselist=False)

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    plc_id = Column(Integer, ForeignKey("plcs.id"), nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # temperature, rpm, state, pressure
    unit = Column(String, nullable=True)
    address = Column(Integer, nullable=False)
    function_code = Column(Integer, nullable=False)
    scale_factor = Column(Float, default=1.0)
    offset = Column(Float, default=0.0)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    data_type = Column(String, default="int16")
    precision = Column(Integer, default=2)
    swap = Column(String, nullable=True)
    is_discrete = Column(Boolean, default=False)
    display_format = Column(String, nullable=True)
    metadata_info = Column(JSON, nullable=True, name="metadata")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    plc = relationship("PLC", back_populates="sensors")
    data = relationship("SensorData", back_populates="sensor")
    last_value = relationship("SensorLastValue", back_populates="sensor", uselist=False)

class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    value = Column(Float, nullable=False)
    quality = Column(Integer, default=0)
    raw_value = Column(Integer, nullable=True)
    metadata_info = Column(JSON, nullable=True, name="metadata")

    sensor = relationship("Sensor", back_populates="data")

class SensorLastValue(Base):
    __tablename__ = "sensor_last_value"

    sensor_id = Column(Integer, ForeignKey("sensors.id"), primary_key=True)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    value = Column(Float, nullable=False)
    quality = Column(Integer, default=0)

    sensor = relationship("Sensor", back_populates="last_value")

class PLCStatus(Base):
    __tablename__ = "plc_status"

    plc_id = Column(Integer, ForeignKey("plcs.id"), primary_key=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String, nullable=False) # online, offline, error
    last_error = Column(String, nullable=True)

    plc = relationship("PLC", back_populates="status")
