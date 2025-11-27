// ============================================
// Backend API Types (matching API documentation v0.7.2)
// ============================================

// Backend Connection Models
export interface BackendConnection {
  id: string;
  name: string;
  description?: string;
  httpBaseUrl: string;
  wsUrl: string;
  mqttUrl?: string;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
  composePath?: string;
  isDefault: boolean;
  status?: 'online' | 'offline' | 'unknown';
}

// ============================================
// API Response Types
// ============================================

// Machine from API: GET /api/machines
export interface Machine {
  id: number;
  code: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string | null;
  // Frontend-only computed fields
  status?: 'running' | 'stopped' | 'alarm' | 'maintenance';
  uptime?: string;
  lastUpdate?: string;
}

// PLC from API: GET /api/plcs
export interface PLC {
  id: number;
  machine_id: number;
  code: string;
  name: string;
  protocol: string;
  ip_address: string;
  port: number;
  unit_id: number;
  poll_interval_s: number;
  enabled: boolean;
  created_at: string;
  updated_at?: string | null;
}

// PLC Update payload: PATCH /api/plcs/{plc_id}
export interface PLCUpdate {
  enabled?: boolean;
  poll_interval_s?: number;
  ip_address?: string;
  port?: number;
}

// Sensor from API: GET /api/sensors
export interface Sensor {
  id: number;
  plc_id: number;
  code: string;
  name: string;
  type: string; // 'temperature', 'rpm', 'boolean', 'program', etc.
  unit: string;
  address: number;
  function_code: number;
  scale_factor: number;
  offset: number;
  data_type: string; // 'int16', 'uint16', 'float32', 'uint32', etc.
  precision: number;
  swap?: string | null; // 'word', 'byte', null
  is_discrete: boolean;
  display_format?: string | null; // 'boolean', 'mapped', null
  value_map?: Record<string, string> | null; // For type='program'
  created_at: string;
  updated_at?: string | null;
}

// Sensor with MQTT Topic: GET /api/sensors/mqtt-topics
export interface SensorWithMQTT {
  id: number;
  code: string;
  name: string;
  type: string;
  unit: string;
  display_format?: string | null;
  value_map?: Record<string, string> | null;
  mqtt_topic: string;
  machine_code: string;
  machine_name: string;
  plc_code: string;
}

// History Datapoint: GET /api/sensors/{sensor_id}/history
export interface HistoryDatapoint {
  timestamp: string;
  value: number;
}

// ============================================
// Logs API Types
// ============================================

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR';
export type LogSource = 'SYSTEM' | 'API' | 'COLLECTOR';

export interface SystemLog {
  id: number;
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  details?: any | null;
}

export interface LogsQueryParams {
  level?: LogLevel;
  source?: LogSource;
  limit?: number;
  skip?: number;
}

// ============================================
// Admin/Configuration Types
// ============================================

// Machine Config File: GET /api/admin/machines-config
export interface MachineConfigFile {
  filename: string;
  enabled: boolean;
}

// Update Machine Config: POST /api/admin/machines-config
export interface MachineConfigUpdate {
  files: MachineConfigFile[];
}

// Export Configuration: GET /api/export/configuration
export interface ExportConfiguration {
  assets: Machine[];
  sensors: Sensor[];
}

// ============================================
// WebSocket Types (Real-time)
// ============================================

// Subscribe message to send
export interface WSSubscribeMessage {
  action: 'subscribe';
  sensors: string[]; // Array of sensor codes
}

// Measurement received from WebSocket
export interface WSMeasurement {
  type: 'measurement';
  sensor_code: string;
  timestamp: string;
  value: number;
  unit: string;
}

// ============================================
// MQTT Types (via direct MQTT or proxy)
// ============================================

// Sensor data payload from MQTT: machines/{machine_code}/{plc_code}/{sensor_code}
export interface MQTTSensorPayload {
  sensor_code: string;
  timestamp: string;
  value: number;
  raw_value?: number;
  quality?: number;
  unit: string;
  machine?: string;
  plc?: string;
  display_value?: string; // Formatted/mapped value for display
}

// System status from MQTT: system/status
export interface MQTTSystemStatus {
  timestamp: string;
  collector: {
    status: 'online' | 'offline';
    stats: CollectorStats;
  };
  postgresql: PostgreSQLStats;
  mqtt: {
    status: 'online' | 'offline';
    host: string;
    port: number;
  };
}

export interface CollectorStats {
  records_saved: number;
  records_failed: number;
  avg_write_time_ms: number;
  last_write_time_ms: number;
  write_operations: number;
  last_error?: string | null;
  uptime_seconds: number;
}

export interface PostgreSQLStats {
  status: 'online' | 'offline';
  connections: {
    total: number;
    active: number;
    idle: number;
  };
  database_size: {
    bytes: number;
    mb: number;
    gb: number;
  };
  tables: {
    sensor_data: number;
    sensors: number;
    plcs?: number;
    machines?: number;
  };
  performance: {
    total_inserts: number;
    total_updates?: number;
    total_deletes?: number;
    cache_hit_ratio: number;
  };
}

// ============================================
// Dashboard Specific (Frontend)
// ============================================

export interface DashboardMetric {
  id: string;
  label: string;
  sensorCode: string; // Links to sensor.code
  machineName: string;
  machineCode: string;
  groupColor?: string;
  unit: string;
  setPoint?: number;
  value?: number;
  tolerance?: number;
}

// ============================================
// Layout & Widgets (Frontend)
// ============================================

export type WidgetType = 'gauge' | 'line_chart' | 'status' | 'digital_io' | 'action_button' | 'logbook';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  machineId: string;
  machineCode?: string;
  sensorCode?: string;
  plcCode?: string;
  modbusAddress?: number;
  cols: number;
  config?: {
    min?: number;
    max?: number;
    thresholds?: { value: number; color: string }[];
    [key: string]: any;
  };
}

export interface MachineLayout {
  machineId: string;
  widgets: WidgetConfig[];
}

// ============================================
// Event / Alarm (Frontend - future API)
// ============================================

export interface ScadaEvent {
  id: string;
  timestamp: string;
  machineName: string;
  machineCode?: string;
  message: string;
  severity: 'info' | 'warning' | 'alarm';
  status: 'active' | 'acknowledged' | 'cleared';
  sensorCode?: string;
}

// ============================================
// Boards & Layouts (Frontend - Dashboard System)
// ============================================

export interface BoardWidgetLayout {
  id: string;
  type: 'gauge' | 'line_chart' | 'kpi' | 'status' | 'alarm' | 'digital_io';
  title: string;
  sensorCode: string;
  sensorName?: string;
  unit?: string;
  machineId: number;
  machineCode?: string;
  
  // Grid position (for drag & drop)
  x: number;
  y: number;
  w: number;
  h: number;
  
  // Widget-specific config
  config?: {
    min?: number;
    max?: number;
    thresholds?: Array<{ value: number; color: string }>;
    timeRange?: '1h' | '24h' | '7d' | '30d';
    refreshInterval?: number; // milliseconds
    [key: string]: any;
  };
}

export interface BoardTab {
  id: string;
  name: string;
  machineId: number;
  machineCode: string;
  machineName: string;
  widgets: BoardWidgetLayout[];
  order: number;
  isActive?: boolean;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  tabs: BoardTab[];
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

// ============================================
// API Response Wrappers
// ============================================

export interface APIHealthResponse {
  status: 'ok';
}

export interface APIVersionResponse {
  version: string;
}

export interface APIErrorResponse {
  detail: string;
}
