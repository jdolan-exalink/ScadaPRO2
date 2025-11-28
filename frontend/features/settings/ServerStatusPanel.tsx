import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, Database, Radio, Cpu, HardDrive, Activity, 
  RefreshCw, Wifi, WifiOff, CheckCircle, XCircle, 
  Clock, Zap, MemoryStick, Globe, Users, AlertTriangle,
  Eye, X, Search
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { scadaBackendService } from '../../services/scadaBackendService';
import { mqttService } from '../../services/mqttService';
import { MQTTSystemStatus, PostgreSQLStats, CollectorStats } from '../../types';

// Interface for sensor values from MQTT
interface SensorData {
  sensorCode: string;
  machineCode: string;
  plcCode: string;
  value: any;
  timestamp: number;
  unit?: string;
}

interface ServerStatus {
  server: {
    name: string;
    version: string;
    nodeVersion: string;
    platform: string;
    arch: string;
    hostname: string;
    uptime: number;
    startTime: string;
  };
  system: {
    cpuCount: number;
    cpuUsage: number;
    cpuModel: string;
    totalMemory: number;
    freeMemory: number;
    usedMemory: number;
    memoryUsage: number;
    systemUptime: number;
    loadAverage: number[];
  };
  process: {
    pid: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  mqtt: {
    status: string;
    connected: boolean;
    broker: string;
    topic: string;
    machines: number;
    sensors: number;
    totalMessages: number;
    messagesPerSecond: number;
  };
  database: {
    status: string;
    reachable: boolean;
    host: string;
    port: number;
    name: string;
    user: string;
    error?: string;
    total_records?: number;
  };
  collector: {
    status: string;
    reachable: boolean;
    host: string;
    port: number;
    enabled: boolean;
    latency?: number;
    error?: string;
    ip?: string;
  };
  connections: {
    websocketClients: number;
  };
}

// Format bytes to human readable
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Format uptime to human readable
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

// Status indicator component
const StatusBadge: React.FC<{ status: string; reachable?: boolean }> = ({ status, reachable }) => {
  const isOnline = status === 'online' || reachable === true;
  const isOffline = status === 'offline' || reachable === false;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isOnline ? 'bg-green-500/20 text-green-400' :
      isOffline ? 'bg-red-500/20 text-red-400' :
      'bg-yellow-500/20 text-yellow-400'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        isOnline ? 'bg-green-400 animate-pulse' :
        isOffline ? 'bg-red-400' :
        'bg-yellow-400'
      }`} />
      {status === 'online' ? 'Online' : 
       status === 'offline' ? 'Offline' : 
       status === 'reachable' ? 'Accesible' :
       status === 'timeout' ? 'Timeout' :
       status === 'error' ? 'Error' : 
       'Desconocido'}
    </span>
  );
};

// Progress bar component
const ProgressBar: React.FC<{ value: number; max?: number; color?: string; label?: string }> = ({ 
  value, max = 100, color = 'blue', label 
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const colorClass = 
    color === 'green' ? 'bg-green-500' :
    color === 'red' ? 'bg-red-500' :
    color === 'yellow' ? 'bg-yellow-500' :
    color === 'purple' ? 'bg-purple-500' :
    'bg-blue-500';
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">{label}</span>
          <span className="text-white font-mono">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-2 bg-scada-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Metric card component
const MetricCard: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  subValue?: string;
  color?: string;
}> = ({ icon, label, value, subValue, color = 'blue' }) => {
  const colorClass = 
    color === 'green' ? 'text-green-400 bg-green-500/10' :
    color === 'red' ? 'text-red-400 bg-red-500/10' :
    color === 'yellow' ? 'text-yellow-400 bg-yellow-500/10' :
    color === 'purple' ? 'text-purple-400 bg-purple-500/10' :
    'text-blue-400 bg-blue-500/10';
  
  return (
    <div className={`rounded-lg p-3 ${colorClass.split(' ')[1]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={colorClass.split(' ')[0]}>{icon}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className={`text-xl font-bold ${colorClass.split(' ')[0]}`}>{value}</div>
      {subValue && <div className="text-xs text-slate-500 mt-0.5">{subValue}</div>}
    </div>
  );
};

// Props interface for receiving sensor data from parent
interface SensorValueData {
  value: any;
  timestamp: number;
  flash: boolean;
  machineCode?: string;
  plcCode?: string;
  unit?: string;
}

interface ServerStatusPanelProps {
  sensorValues?: Record<string, SensorValueData>;
}

export const ServerStatusPanel: React.FC<ServerStatusPanelProps> = ({ sensorValues = {} }) => {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // MQTT system data from collector
  const [collectorStats, setCollectorStats] = useState<CollectorStats | null>(null);
  const [postgresStats, setPostgresStats] = useState<PostgreSQLStats | null>(null);
  const [mqttSystemStatus, setMqttSystemStatus] = useState<MQTTSystemStatus | null>(null);
  
  // Sensors monitor modal
  const [showSensorsModal, setShowSensorsModal] = useState(false);
  const [sensorFilter, setSensorFilter] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  
  // Sensors from backend API (as fallback/primary source)
  const [backendSensors, setBackendSensors] = useState<Record<string, SensorValueData>>({});
  
  // Combine sensors from props (WebSocket) and backend API
  const combinedSensorValues = React.useMemo((): Record<string, SensorValueData> => {
    // Merge both sources, preferring more recent data
    const combined: Record<string, SensorValueData> = {};
    
    // First add backend sensors
    for (const [code, data] of Object.entries(backendSensors) as [string, SensorValueData][]) {
      combined[code] = data;
    }
    
    // Then overlay WebSocket sensors (newer data wins)
    for (const [code, data] of Object.entries(sensorValues) as [string, SensorValueData][]) {
      const existing = combined[code];
      if (!existing || data.timestamp > existing.timestamp) {
        combined[code] = data;
      }
    }
    
    return combined;
  }, [sensorValues, backendSensors]);
  
  // Convert combined sensorValues to SensorData map
  const sensorsData = React.useMemo(() => {
    const map = new Map<string, SensorData>();
    const entries = Object.entries(combinedSensorValues);
    
    entries.forEach(([sensorCode, data]: [string, SensorValueData]) => {
      const machineCode = data.machineCode || 'unknown';
      const plcCode = data.plcCode || 'unknown';
      
      map.set(sensorCode, {
        sensorCode,
        machineCode,
        plcCode,
        value: data.value,
        unit: data.unit || '',
        timestamp: data.timestamp
      });
    });
    return map;
  }, [combinedSensorValues]);

  // Get unique machines from sensor data
  const detectedMachines = React.useMemo(() => {
    const machines = new Set<string>();
    sensorsData.forEach((sensor) => {
      if (sensor.machineCode && sensor.machineCode !== 'unknown') {
        machines.add(sensor.machineCode);
      }
    });
    return Array.from(machines).sort();
  }, [sensorsData]);

  // Filter sensors by selected machine
  const filteredSensors = React.useMemo(() => {
    let sensors = Array.from(sensorsData.values()) as SensorData[];
    
    // Filter by selected machine
    if (selectedMachine) {
      sensors = sensors.filter(s => s.machineCode === selectedMachine);
    }
    
    // Filter by search text
    if (sensorFilter) {
      const filter = sensorFilter.toLowerCase();
      sensors = sensors.filter(s => 
        s.sensorCode.toLowerCase().includes(filter) ||
        s.machineCode.toLowerCase().includes(filter) ||
        s.plcCode.toLowerCase().includes(filter)
      );
    }
    
    return sensors.sort((a, b) => a.sensorCode.localeCompare(b.sensorCode));
  }, [sensorsData, selectedMachine, sensorFilter]);

  // Fetch sensors from backend API
  const fetchSensorsFromBackend = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/sensors/last-values', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.sensors) {
          setBackendSensors(data.sensors);
        }
      }
    } catch (e) {
      console.error('Error fetching sensors from backend:', e);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await adminService.getServerStatus();
      if (data) {
        setStatus(data);
        setError(null);
        setLastUpdate(new Date());
      } else {
        setError('No se pudo conectar al servidor backend');
      }
    } catch (e: any) {
      setError(e.message || 'Error al obtener estado del servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to MQTT system topics for collector data
  useEffect(() => {
    // Register for system status from collector via MQTT
    mqttService.onSystemStatus((systemStatus) => {
      console.log('📊 System status from collector via MQTT:', systemStatus);
      setMqttSystemStatus(systemStatus);
      if (systemStatus.collector?.stats) {
        setCollectorStats(systemStatus.collector.stats);
      }
      if (systemStatus.postgresql) {
        setPostgresStats(systemStatus.postgresql);
      }
      setLastUpdate(new Date());
    });
    
    // Also register for PostgreSQL status separately
    mqttService.onPostgreSQLStatus((stats) => {
      console.log('📊 PostgreSQL status from MQTT:', stats);
      setPostgresStats(stats);
    });
    
    // Note: Sensor data is now received via props from SettingsPage
    // which already has the MQTT subscription
    
    return () => {
      // Cleanup subscriptions if needed
    };
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchSensorsFromBackend();
  }, [fetchStatus, fetchSensorsFromBackend]);

  // Auto refresh every 5 seconds - also refresh sensors
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStatus();
      fetchSensorsFromBackend();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus, fetchSensorsFromBackend]);

  const handleRefresh = () => {
    setLoading(true);
    fetchStatus();
    fetchSensorsFromBackend();
  };

  if (loading && !status) {
    return (
      <div className="bg-scada-800 border border-scada-700 rounded-xl p-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <RefreshCw className="animate-spin text-scada-500" size={24} />
          <span className="text-slate-400">Cargando estado del servidor...</span>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="bg-scada-800 border border-scada-700 rounded-xl p-6">
        <div className="flex items-center gap-3 text-amber-400">
          <AlertTriangle size={24} />
          <div>
            <div className="font-semibold">Estado del servidor no disponible</div>
            <div className="text-sm text-slate-400">{error || 'No se pudo conectar al backend. Verifica que esté corriendo en la configuración.'}</div>
          </div>
        </div>
        <button 
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-scada-700 hover:bg-scada-600 rounded text-white text-sm flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-scada-800 border border-scada-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-scada-700 bg-scada-900">
        <div className="flex items-center gap-3">
          <Server className="text-blue-400" size={24} />
          <div>
            <h3 className="font-bold text-white text-lg">Estado de Servidor Backend</h3>
            <p className="text-xs text-slate-400">
              {status.server.hostname} • Node {status.server.nodeVersion} • {status.server.platform}/{status.server.arch}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded bg-scada-700 border-scada-600"
            />
            Auto refresh
          </label>
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded bg-scada-700 hover:bg-scada-600 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Service Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* MQTT Status */}
          <div className="bg-scada-900 rounded-lg p-4 border border-scada-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Radio className={status.mqtt.connected ? 'text-green-400' : 'text-red-400'} size={20} />
                <span className="font-semibold text-white">MQTT Broker</span>
              </div>
              <StatusBadge status={status.mqtt.status} reachable={status.mqtt.connected} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Broker</span>
                <span className="text-white font-mono text-xs">{status.mqtt.broker}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Topic</span>
                <span className="text-white font-mono text-xs">{status.mqtt.topic}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Máquinas</span>
                <span className="text-green-400 font-bold">{status.mqtt.machines}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sensores</span>
                <span className="text-blue-400 font-bold">{status.mqtt.sensors}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mensajes</span>
                <span className="text-yellow-400 font-bold">{(status.mqtt.totalMessages || 0)?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Velocidad</span>
                <span className="text-purple-400 font-bold">{status.mqtt.messagesPerSecond} msg/s</span>
              </div>
            </div>
          </div>

          {/* Database Status */}
          <div className="bg-scada-900 rounded-lg p-4 border border-scada-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className={status.database.reachable ? 'text-green-400' : 'text-red-400'} size={20} />
                <span className="font-semibold text-white">PostgreSQL</span>
              </div>
              <StatusBadge status={status.database.status} reachable={status.database.reachable} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Host</span>
                <span className="text-white font-mono text-xs">{status.database.host}:{status.database.port}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Base de datos</span>
                <span className="text-white font-mono text-xs">{status.database.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Usuario</span>
                <span className="text-white font-mono text-xs">{status.database.user}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Registros</span>
                <span className="text-yellow-400 font-bold">{(status.database.total_records || 0)?.toLocaleString()}</span>
              </div>
              {status.database.error && (
                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded mt-2">
                  {status.database.error}
                </div>
              )}
            </div>
          </div>

          {/* Colector API Status */}
          <div className="bg-scada-900 rounded-lg p-4 border border-scada-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className={status.collector.reachable ? 'text-green-400' : 'text-red-400'} size={20} />
                <span className="font-semibold text-white">Colector API</span>
              </div>
              <StatusBadge status={status.collector.status} reachable={status.collector.reachable} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Host</span>
                <span className="text-white font-mono text-xs">{status.collector.host}:{status.collector.port}</span>
              </div>
              {status.collector.ip && (
                <div className="flex justify-between">
                  <span className="text-slate-400">IP LAN</span>
                  <span className="text-cyan-400 font-mono text-xs">{status.collector.ip}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Estado</span>
                <span className={status.collector.enabled ? 'text-green-400' : 'text-slate-500'}>
                  {status.collector.enabled ? 'Habilitado' : 'Deshabilitado'}
                </span>
              </div>
              {status.collector.latency && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Latencia</span>
                  <span className="text-yellow-400 font-bold">{status.collector.latency}ms</span>
                </div>
              )}
              {status.collector.error && (
                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded mt-2">
                  {status.collector.error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard 
            icon={<Cpu size={18} />}
            label="CPU"
            value={`${status.system.cpuUsage}%`}
            subValue={`${status.system.cpuCount} cores`}
            color={status.system.cpuUsage > 80 ? 'red' : status.system.cpuUsage > 50 ? 'yellow' : 'green'}
          />
          <MetricCard 
            icon={<MemoryStick size={18} />}
            label="Memoria"
            value={`${Math.round(status.system.memoryUsage)}%`}
            subValue={`${formatBytes(status.system.usedMemory)} / ${formatBytes(status.system.totalMemory)}`}
            color={status.system.memoryUsage > 80 ? 'red' : status.system.memoryUsage > 50 ? 'yellow' : 'green'}
          />
          <MetricCard 
            icon={<Clock size={18} />}
            label="Uptime Servidor"
            value={formatUptime(status.server.uptime)}
            subValue={`PID: ${status.process.pid}`}
            color="blue"
          />
          <MetricCard 
            icon={<Users size={18} />}
            label="WebSocket Clients"
            value={status.connections.websocketClients}
            subValue="Conexiones activas"
            color="purple"
          />
        </div>

        {/* Resource Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-scada-900 rounded-lg p-4 border border-scada-700">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cpu size={16} className="text-blue-400" />
              Uso de CPU
            </h4>
            <ProgressBar 
              value={status.system.cpuUsage} 
              color={status.system.cpuUsage > 80 ? 'red' : status.system.cpuUsage > 50 ? 'yellow' : 'green'}
              label="Uso total"
            />
            <div className="text-xs text-slate-400">
              {status.system.cpuModel}
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-slate-400">Load avg:</span>
              {status.system.loadAverage.map((load, i) => (
                <span key={i} className="text-white font-mono">
                  {load.toFixed(2)}
                </span>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <MemoryStick size={16} className="text-purple-400" />
              Uso de Memoria
            </h4>
            <ProgressBar 
              value={status.system.memoryUsage} 
              color={status.system.memoryUsage > 80 ? 'red' : status.system.memoryUsage > 50 ? 'yellow' : 'purple'}
              label="Memoria del sistema"
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Total: </span>
                <span className="text-white font-mono">{formatBytes(status.system.totalMemory)}</span>
              </div>
              <div>
                <span className="text-slate-400">Usado: </span>
                <span className="text-white font-mono">{formatBytes(status.system.usedMemory)}</span>
              </div>
              <div>
                <span className="text-slate-400">Disponible: </span>
                <span className="text-white font-mono">{formatBytes(status.system.freeMemory)}</span>
              </div>
              <div>
                <span className="text-slate-400">Backend: </span>
                <span className="text-white font-mono">{formatBytes(status.process.rss)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collector Stats from MQTT */}
        {(collectorStats || postgresStats) && (
          <div className="bg-scada-900 rounded-lg p-4 border border-scada-700">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Activity size={16} className="text-cyan-400" />
              Estadísticas del Colector (via MQTT)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {collectorStats && (
                <>
                  <MetricCard 
                    icon={<Database size={18} />}
                    label="Registros Guardados"
                    value={collectorStats.records_saved?.toLocaleString() || '0'}
                    subValue={`${collectorStats.records_failed || 0} fallidos`}
                    color="green"
                  />
                  <MetricCard 
                    icon={<Zap size={18} />}
                    label="Tiempo de Escritura"
                    value={`${collectorStats.avg_write_time_ms?.toFixed(1) || 0}ms`}
                    subValue={`Último: ${collectorStats.last_write_time_ms || 0}ms`}
                    color="yellow"
                  />
                  <MetricCard 
                    icon={<Clock size={18} />}
                    label="Uptime Colector"
                    value={formatUptime(collectorStats.uptime_seconds || 0)}
                    subValue={`${collectorStats.write_operations || 0} ops`}
                    color="blue"
                  />
                </>
              )}
              {postgresStats && (
                <MetricCard 
                  icon={<Database size={18} />}
                  label="Tamaño BD"
                  value={`${postgresStats.database_size?.gb?.toFixed(2) || 0} GB`}
                  subValue={`${postgresStats.connections?.active || 0} conexiones activas`}
                  color="purple"
                />
              )}
            </div>
            
            {postgresStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-scada-800 rounded">
                  <div className="text-2xl font-bold text-green-400">{(postgresStats?.tables?.sensor_data || 0)?.toLocaleString()}</div>
                  <div className="text-xs text-slate-400">Registros sensor_data</div>
                </div>
                <div className="text-center p-3 bg-scada-800 rounded">
                  <div className="text-2xl font-bold text-blue-400">{postgresStats.tables?.sensors || 0}</div>
                  <div className="text-xs text-slate-400">Sensores en BD</div>
                </div>
                <div className="text-center p-3 bg-scada-800 rounded">
                  <div className="text-2xl font-bold text-purple-400">{postgresStats?.tables?.machines || 0}</div>
                  <div className="text-xs text-slate-400">Máquinas</div>
                </div>
                <div className="text-center p-3 bg-scada-800 rounded">
                  <div className="text-2xl font-bold text-yellow-400">{((postgresStats?.performance?.cache_hit_ratio || 0) * 100)?.toFixed(1) || 0}%</div>
                  <div className="text-xs text-slate-400">Cache Hit Ratio</div>
                </div>
                <div className="text-center p-3 bg-scada-800 rounded md:col-start-1">
                  <div className="text-2xl font-bold text-indigo-400">{(postgresStats?.total_records || 0)?.toLocaleString() || 0}</div>
                  <div className="text-xs text-slate-400">Total Registros BD</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sensors Monitor Button */}
        <div className="flex items-center justify-between p-4 bg-scada-900 rounded-lg border border-scada-700">
          <div className="flex items-center gap-3">
            <Eye className="text-cyan-400" size={24} />
            <div>
              <h4 className="font-semibold text-white">Monitor de Sensores</h4>
              <p className="text-xs text-slate-400">
                {sensorsData.size} sensores activos recibiendo datos en tiempo real
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSensorsModal(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Eye size={18} />
            Ver Sensores en Vivo
          </button>
        </div>

      </div>

      {/* Sensors Monitor Modal */}
      {showSensorsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-scada-800 border border-scada-600 rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-scada-700">
              <div className="flex items-center gap-3">
                <Eye className="text-cyan-400" size={24} />
                <div>
                  <h3 className="font-bold text-white text-lg">Monitor de Sensores en Tiempo Real</h3>
                  <p className="text-xs text-slate-400">
                    {detectedMachines.length} máquinas detectadas • {sensorsData.size} sensores activos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSensorsModal(false)}
                className="p-2 hover:bg-scada-700 rounded-lg transition-colors"
              >
                <X className="text-slate-400 hover:text-white" size={20} />
              </button>
            </div>
            
            {/* Machine Selector and Search Filter */}
            <div className="p-4 border-b border-scada-700 space-y-3">
              {/* Machine Dropdown */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-400 whitespace-nowrap">Seleccionar Máquina:</label>
                <select
                  value={selectedMachine}
                  onChange={(e) => setSelectedMachine(e.target.value)}
                  className="flex-1 px-4 py-2 bg-scada-900 border border-scada-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">-- Todas las máquinas --</option>
                  {detectedMachines.map((machine) => {
                    const sensorCount = (Array.from(sensorsData.values()) as SensorData[]).filter((s: SensorData) => s.machineCode === machine).length;
                    return (
                      <option key={machine} value={machine}>
                        {machine} ({sensorCount} sensores)
                      </option>
                    );
                  })}
                </select>
              </div>
              
              {/* Search Filter */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={sensorFilter}
                  onChange={(e) => setSensorFilter(e.target.value)}
                  placeholder="Buscar sensor por código o PLC..."
                  className="w-full pl-10 pr-4 py-2 bg-scada-900 border border-scada-600 rounded-lg text-white placeholder-slate-500"
                />
              </div>
            </div>
            
            {/* Sensors Table */}
            <div className="flex-1 overflow-auto p-4">
              {/* Machine Info Header */}
              {selectedMachine && (
                <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="text-cyan-400" size={20} />
                    <div>
                      <span className="text-white font-semibold">{selectedMachine}</span>
                      <span className="text-slate-400 text-sm ml-2">
                        • {filteredSensors.length} sensores monitoreados
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMachine('')}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Ver todas las máquinas
                  </button>
                </div>
              )}
              
              <table className="w-full">
                <thead className="sticky top-0 bg-scada-800">
                  <tr className="text-left text-xs text-slate-400 border-b border-scada-700">
                    <th className="pb-2 pr-4">Sensor</th>
                    {!selectedMachine && <th className="pb-2 pr-4">Máquina</th>}
                    <th className="pb-2 pr-4">PLC</th>
                    <th className="pb-2 pr-4 text-right">Valor</th>
                    <th className="pb-2 pr-4">Unidad</th>
                    <th className="pb-2 text-right">Última Actualización</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSensors.map((sensor: SensorData) => {
                      const timeSince = Math.floor((Date.now() - sensor.timestamp) / 1000);
                      const isRecent = timeSince < 5;
                      
                      return (
                        <tr 
                          key={sensor.sensorCode} 
                          className={`border-b border-scada-700/50 hover:bg-scada-700/30 transition-colors ${
                            isRecent ? 'bg-green-500/10' : ''
                          }`}
                        >
                          <td className="py-2 pr-4">
                            <span className="font-mono text-sm text-cyan-400">{sensor.sensorCode}</span>
                          </td>
                          {!selectedMachine && (
                            <td className="py-2 pr-4">
                              <span className="text-sm text-white">{sensor.machineCode}</span>
                            </td>
                          )}
                          <td className="py-2 pr-4">
                            <span className="text-sm text-slate-400">{sensor.plcCode}</span>
                          </td>
                          <td className="py-2 pr-4 text-right">
                            <span className={`font-mono text-lg font-bold ${isRecent ? 'text-green-400' : 'text-white'}`}>
                              {typeof sensor.value === 'number' 
                                ? sensor.value.toFixed(2) 
                                : String(sensor.value)}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            <span className="text-sm text-slate-400">{sensor.unit || '-'}</span>
                          </td>
                          <td className="py-2 text-right">
                            <span className={`text-xs ${timeSince < 5 ? 'text-green-400' : timeSince < 30 ? 'text-yellow-400' : 'text-slate-500'}`}>
                              {timeSince < 60 ? `hace ${timeSince}s` : `hace ${Math.floor(timeSince / 60)}m`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              
              {filteredSensors.length === 0 && sensorsData.size === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Activity className="mx-auto mb-3 opacity-50" size={48} />
                  <p>No hay datos de sensores disponibles</p>
                  <p className="text-xs mt-1">Los datos aparecerán cuando el colector envíe mediciones via MQTT</p>
                </div>
              )}
              
              {filteredSensors.length === 0 && sensorsData.size > 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Search className="mx-auto mb-3 opacity-50" size={48} />
                  <p>No se encontraron sensores con los filtros actuales</p>
                  <p className="text-xs mt-1">Intenta cambiar la máquina seleccionada o el texto de búsqueda</p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-scada-700 flex items-center justify-between text-xs text-slate-500">
              <span>
                Mostrando {filteredSensors.length} de {sensorsData.size} sensores
                {selectedMachine && <span className="text-cyan-400 ml-2">• Máquina: {selectedMachine}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Actualizando en tiempo real
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
