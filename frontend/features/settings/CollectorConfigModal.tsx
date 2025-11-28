import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Server, Radio, RefreshCw, CheckCircle, Wifi, Database, AlertCircle, Cpu, Activity } from 'lucide-react';
import { adminService, CollectorConfig } from '../../services/adminService';

// Configuración por defecto con IP 10.147.18.10 y token conocido
const DEFAULT_CONFIG: CollectorConfig = {
  collector: {
    host: '10.147.18.10',
    port: 8000,
    token: 'Ya_3n2CUIdhUbvV1hkT8SMb-TH8rGp1N0rxng9y6dqI',
    enabled: true
  },
  mqtt: {
    broker_url: 'mqtt://10.147.18.10:1883',
    mqtt_host: '10.147.18.10',
    mqtt_port: 1883,
    topic: 'machines/#',
    enabled: true
  },
  database: {
    host: '10.147.18.10',
    port: 5432,
    user: 'backend',
    password: 'backend_pass',
    name: 'industrial',
    driver: 'postgresql+asyncpg',
    record_save_interval: 10
  }
};

// Connection status types
interface ConnectionStatus {
  status: 'idle' | 'testing' | 'online' | 'offline' | 'error' | 'auth_error' | 'reachable' | 'timeout' | 'unknown';
  latency?: number;
  error?: string;
  message?: string;
  machines?: number;
  sensors?: number;
  totalMessages?: number;
}

// Machine info from MQTT
interface MachineInfo {
  code: string;
  plcCode: string;
  sensors: string[];
  sensorCount: number;
  lastSeen: string;
  messageCount: number;
  isActive: boolean;
}

interface Props {
  onClose: () => void;
  onSave?: () => void;
}

export const CollectorConfigModal: React.FC<Props> = ({ onClose, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<CollectorConfig>(DEFAULT_CONFIG);
  
  // Individual connection statuses
  const [collectorStatus, setCollectorStatus] = useState<ConnectionStatus>({ status: 'idle' });
  const [mqttStatus, setMqttStatus] = useState<ConnectionStatus>({ status: 'idle' });
  const [databaseStatus, setDatabaseStatus] = useState<ConnectionStatus>({ status: 'idle' });
  
  // Connected machines from MQTT
  const [connectedMachines, setConnectedMachines] = useState<MachineInfo[]>([]);
  const [mqttSummary, setMqttSummary] = useState<{ totalMachines: number; activeMachines: number; totalSensors: number; totalMessages: number } | null>(null);

  // Cargar configuración al abrir el modal (desde backend)
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load from backend first
      const config = await adminService.loadCollectorConfigFromBackend();
      setFormData({
        collector: {
          host: config.collector?.host || DEFAULT_CONFIG.collector.host,
          port: config.collector?.port || DEFAULT_CONFIG.collector.port,
          token: config.collector?.token || DEFAULT_CONFIG.collector.token,
          enabled: config.collector?.enabled ?? true
        },
        mqtt: {
          broker_url: config.mqtt?.broker_url || DEFAULT_CONFIG.mqtt.broker_url,
          mqtt_host: config.mqtt?.mqtt_host || DEFAULT_CONFIG.mqtt.mqtt_host,
          mqtt_port: config.mqtt?.mqtt_port || DEFAULT_CONFIG.mqtt.mqtt_port,
          topic: config.mqtt?.topic || DEFAULT_CONFIG.mqtt.topic,
          enabled: config.mqtt?.enabled ?? true
        },
        database: {
          host: config.database?.host || DEFAULT_CONFIG.database.host,
          port: config.database?.port || DEFAULT_CONFIG.database.port,
          user: config.database?.user || DEFAULT_CONFIG.database.user,
          password: config.database?.password || DEFAULT_CONFIG.database.password,
          name: config.database?.name || DEFAULT_CONFIG.database.name,
          driver: config.database?.driver || DEFAULT_CONFIG.database.driver
        }
      });
      
      // Load current connection status
      const status = await adminService.getConnectionStatus();
      setCollectorStatus({ status: status.collector?.status || 'unknown' });
      setMqttStatus({ 
        status: status.mqtt?.status || 'unknown',
        machines: status.mqtt?.machines,
        sensors: status.mqtt?.sensors,
        totalMessages: status.mqtt?.totalMessages
      });
      setDatabaseStatus({ status: status.database?.status || 'unknown' });
      
      // Load connected machines
      const machinesData = await adminService.getConnectedMachines();
      setConnectedMachines(machinesData.machines);
      setMqttSummary(machinesData.summary);
    } catch (e) {
      console.error('Error loading collector config:', e);
      setFormData(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  // Test individual connections
  const handleTestCollector = async () => {
    setCollectorStatus({ status: 'testing' });
    const result = await adminService.testCollectorConnection(
      formData.collector.host,
      formData.collector.port,
      formData.collector.token
    );
    setCollectorStatus({
      status: result.status as ConnectionStatus['status'],
      latency: result.latency,
      error: result.error
    });
  };

  const handleTestMqtt = async () => {
    setMqttStatus({ status: 'testing' });
    const result = await adminService.testMqttConnection(
      formData.mqtt.mqtt_host,
      formData.mqtt.mqtt_port
    );
    setMqttStatus({
      status: result.status as ConnectionStatus['status'],
      error: result.error,
      machines: result.machines,
      sensors: result.sensors,
      totalMessages: result.totalMessages
    });
    
    // Also refresh connected machines
    if (result.status === 'online') {
      const machinesData = await adminService.getConnectedMachines();
      setConnectedMachines(machinesData.machines);
      setMqttSummary(machinesData.summary);
    }
  };

  const handleTestDatabase = async () => {
    setDatabaseStatus({ status: 'testing' });
    const result = await adminService.testDatabaseConnection(
      formData.database.host,
      formData.database.port,
      formData.database.user,
      formData.database.password,
      formData.database.name
    );
    setDatabaseStatus({
      status: result.status as ConnectionStatus['status'],
      error: result.error,
      message: (result as any).message
    });
  };

  // Test all connections
  const handleTestAll = async () => {
    await Promise.all([
      handleTestCollector(),
      handleTestMqtt(),
      handleTestDatabase()
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Save to backend (persistent in data.yaml)
      const result = await adminService.saveCollectorConfigToBackend(formData);
      
      if (result.success) {
        setSuccess(true);
        
        // Also save locally as cache
        adminService.saveCollectorConfig(formData);
        
        // Notify parent and reload after a brief delay
        setTimeout(() => {
          onSave?.();
          window.location.reload();
        }, 1500);
      } else {
        setError(result.error || 'Error al guardar la configuración');
        setSaving(false);
      }
    } catch (e: any) {
      console.error('Error saving collector config:', e);
      setError(e.message || 'Error al guardar la configuración');
      setSaving(false);
    }
  };

  const handleCollectorChange = (field: keyof CollectorConfig['collector'], value: any) => {
    setFormData(prev => ({
      ...prev,
      collector: { ...prev.collector, [field]: value }
    }));
    setCollectorStatus({ status: 'idle' });
  };

  const handleMqttChange = (field: keyof CollectorConfig['mqtt'], value: any) => {
    setFormData(prev => ({
      ...prev,
      mqtt: { ...prev.mqtt, [field]: value }
    }));
    setMqttStatus({ status: 'idle' });
  };

  const handleDatabaseChange = (field: keyof CollectorConfig['database'], value: any) => {
    setFormData(prev => ({
      ...prev,
      database: { ...prev.database, [field]: value }
    }));
    setDatabaseStatus({ status: 'idle' });
  };

  // Status indicator component
  const StatusIndicator: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
    const getStatusColor = () => {
      switch (status.status) {
        case 'online':
        case 'reachable':
          return 'bg-green-500';
        case 'testing':
          return 'bg-yellow-500 animate-pulse';
        case 'offline':
        case 'timeout':
          return 'bg-red-500';
        case 'error':
        case 'auth_error':
          return 'bg-orange-500';
        default:
          return 'bg-slate-500';
      }
    };
    
    const getStatusText = () => {
      switch (status.status) {
        case 'online': return 'Online';
        case 'reachable': return 'Accesible';
        case 'testing': return 'Probando...';
        case 'offline': return 'Offline';
        case 'timeout': return 'Timeout';
        case 'auth_error': return 'Auth Error';
        case 'error': return 'Error';
        default: return 'Sin probar';
      }
    };
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        <span className="text-xs text-slate-400">
          {getStatusText()}
          {status.latency && ` (${status.latency}ms)`}
        </span>
        {status.error && (
          <span className="text-xs text-orange-400 truncate max-w-32" title={status.error}>
            - {status.error}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-scada-800 border border-scada-600 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-scada-700 bg-scada-900 sticky top-0">
          <div className="flex items-center gap-3">
            <Server className="text-scada-500" size={24} />
            <h3 className="font-bold text-white text-lg">Configuración Backend</h3>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Persistente</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={32} className="animate-spin text-scada-500" />
            <span className="ml-3 text-slate-400">Cargando configuración...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Collector Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-scada-700">
                <div className="flex items-center gap-2">
                  <Server className="text-blue-400" size={18} />
                  <h4 className="text-white font-semibold">Collector (API de Datos)</h4>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIndicator status={collectorStatus} />
                  <button 
                    type="button" 
                    onClick={handleTestCollector}
                    disabled={collectorStatus.status === 'testing'}
                    className="text-xs px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 rounded transition-colors disabled:opacity-50"
                  >
                    Probar
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Host</label>
                  <input 
                    type="text" 
                    required
                    placeholder="10.147.18.10"
                    className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono"
                    value={formData.collector.host}
                    onChange={e => handleCollectorChange('host', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Puerto</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    max={65535}
                    className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono"
                    value={formData.collector.port}
                    onChange={e => handleCollectorChange('port', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Token de Autenticación</label>
                <input 
                  type="text" 
                  required
                  placeholder="Token de acceso al API"
                  className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono text-sm"
                  value={formData.collector.token}
                  onChange={e => handleCollectorChange('token', e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={formData.collector.enabled}
                    onChange={e => handleCollectorChange('enabled', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-scada-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
                <span className="text-sm text-slate-300">Collector Habilitado</span>
              </div>
            </div>

            {/* MQTT Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-scada-700">
                <div className="flex items-center gap-2">
                  <Radio className="text-green-400" size={18} />
                  <h4 className="text-white font-semibold">MQTT (Mensajería en Tiempo Real)</h4>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIndicator status={mqttStatus} />
                  <button 
                    type="button" 
                    onClick={handleTestMqtt}
                    disabled={mqttStatus.status === 'testing'}
                    className="text-xs px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-400 rounded transition-colors disabled:opacity-50"
                  >
                    Probar
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">MQTT Host</label>
                  <input 
                    type="text" 
                    required
                    placeholder="10.147.18.10"
                    className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono"
                    value={formData.mqtt.mqtt_host}
                    onChange={e => handleMqttChange('mqtt_host', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">MQTT Puerto</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    max={65535}
                    className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono"
                    value={formData.mqtt.mqtt_port}
                    onChange={e => handleMqttChange('mqtt_port', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">MQTT Broker URL</label>
                <input 
                  type="text" 
                  required
                  placeholder="mqtt://localhost:1883"
                  className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono text-sm"
                  value={formData.mqtt.broker_url}
                  onChange={e => handleMqttChange('broker_url', e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">URL del broker MQTT (el frontend usa WebSocket en ws://host:8000/ws/realtime)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Topic de Suscripción</label>
                <input 
                  type="text" 
                  required
                  placeholder="machines/#"
                  className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono"
                  value={formData.mqtt.topic}
                  onChange={e => handleMqttChange('topic', e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">Usar # para wildcard (ej: plc/# para todos los PLCs)</p>
              </div>
              
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={formData.mqtt.enabled}
                    onChange={e => handleMqttChange('enabled', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-scada-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
                <span className="text-sm text-slate-300">MQTT Habilitado</span>
              </div>
              
              {/* Connected Machines Summary */}
              {mqttStatus.status === 'online' && mqttSummary && (
                <div className="bg-scada-900/50 rounded-lg p-3 border border-scada-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="text-green-400" size={16} />
                    <span className="text-sm font-medium text-white">Máquinas Conectadas</span>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      {mqttSummary.activeMachines} activas
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                    <div className="bg-scada-800 rounded p-2 text-center">
                      <div className="text-lg font-bold text-green-400">{mqttSummary.totalMachines}</div>
                      <div className="text-slate-500">Máquinas</div>
                    </div>
                    <div className="bg-scada-800 rounded p-2 text-center">
                      <div className="text-lg font-bold text-blue-400">{mqttSummary.totalSensors}</div>
                      <div className="text-slate-500">Sensores</div>
                    </div>
                    <div className="bg-scada-800 rounded p-2 text-center">
                      <div className="text-lg font-bold text-purple-400">{mqttSummary.activeMachines}</div>
                      <div className="text-slate-500">Activas</div>
                    </div>
                    <div className="bg-scada-800 rounded p-2 text-center">
                      <div className="text-lg font-bold text-yellow-400">{mqttSummary.totalMessages.toLocaleString()}</div>
                      <div className="text-slate-500">Mensajes</div>
                    </div>
                  </div>
                  
                  {/* Machine list */}
                  {connectedMachines.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {connectedMachines.slice(0, 10).map((machine) => (
                        <div 
                          key={machine.code}
                          className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                            machine.isActive ? 'bg-green-500/10 border border-green-500/30' : 'bg-scada-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Activity 
                              size={12} 
                              className={machine.isActive ? 'text-green-400 animate-pulse' : 'text-slate-500'} 
                            />
                            <span className="font-mono text-white">{machine.code}</span>
                            <span className="text-slate-500">({machine.plcCode})</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-400">
                            <span>{machine.sensorCount} sensores</span>
                            <span className="text-xs">{machine.messageCount.toLocaleString()} msgs</span>
                          </div>
                        </div>
                      ))}
                      {connectedMachines.length > 10 && (
                        <div className="text-center text-xs text-slate-500 pt-1">
                          ... y {connectedMachines.length - 10} más
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PostgreSQL Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-scada-700">
                <div className="flex items-center gap-2">
                  <Database className="text-purple-400" size={18} />
                  <h4 className="text-white font-semibold">PostgreSQL (Base de Datos)</h4>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIndicator status={databaseStatus} />
                  <button 
                    type="button" 
                    onClick={handleTestDatabase}
                    disabled={databaseStatus.status === 'testing'}
                    className="text-xs px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-400 rounded transition-colors disabled:opacity-50"
                  >
                    Probar
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Host</label>
                  <input 
                    type="text" 
                    required
                    placeholder="db o 10.147.18.10"
                    className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono"
                    value={formData.database.host}
                    onChange={e => handleDatabaseChange('host', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Puerto</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    max={65535}
                    className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono"
                    value={formData.database.port}
                    onChange={e => handleDatabaseChange('port', parseInt(e.target.value) || 5432)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Usuario</label>
                  <input 
                    type="text" 
                    required
                    placeholder="backend"
                    className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono"
                    value={formData.database.user}
                    onChange={e => handleDatabaseChange('user', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Contraseña</label>
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono"
                    value={formData.database.password}
                    onChange={e => handleDatabaseChange('password', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Base de Datos</label>
                  <input 
                    type="text" 
                    required
                    placeholder="industrial"
                    className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono"
                    value={formData.database.name}
                    onChange={e => handleDatabaseChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Driver</label>
                  <input 
                    type="text" 
                    required
                    placeholder="postgresql+asyncpg"
                    className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono text-sm"
                    value={formData.database.driver}
                    onChange={e => handleDatabaseChange('driver', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Intervalo de Guardado de Registros (segundos)</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    max={3600}
                    placeholder="10"
                    className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none font-mono"
                    value={formData.database.record_save_interval || 10}
                    onChange={e => handleDatabaseChange('record_save_interval', parseInt(e.target.value) || 10)}
                  />
                  <p className="text-xs text-slate-500 mt-1">Define cada cuántos segundos se guardan los registros en la BD</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-500">
                Connection string: {formData.database.driver}://{formData.database.user}:****@{formData.database.host}:{formData.database.port}/{formData.database.name}
              </p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
                <CheckCircle size={18} />
                Configuración guardada en data.yaml - Recargando...
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-scada-700">
              <button 
                type="button"
                onClick={handleTestAll}
                disabled={saving || collectorStatus.status === 'testing' || mqttStatus.status === 'testing' || databaseStatus.status === 'testing'}
                className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white flex items-center gap-2 transition-colors"
              >
                {collectorStatus.status === 'testing' || mqttStatus.status === 'testing' || databaseStatus.status === 'testing' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Probando...
                  </>
                ) : (
                  <>
                    <Wifi size={18} />
                    Probar Todas
                  </>
                )}
              </button>
              
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded bg-scada-700 hover:bg-scada-600 text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving || success}
                  className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white flex items-center gap-2 transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Guardando...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle size={18} />
                      ¡Guardado!
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
