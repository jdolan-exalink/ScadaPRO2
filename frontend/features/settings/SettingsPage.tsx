import React, { useState, useEffect, useRef, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import { mqttService } from '../../services/mqttService';
import { PostgreSQLStats } from '../../types';
import { RefreshCw, Cpu, Zap, Wifi, Activity, Save, Check, Settings, Server, Radio, Key, Copy, Database, HardDrive, FileText } from 'lucide-react';
import { CollectorConfigModal } from './CollectorConfigModal';
import { BackendFormModal } from './BackendFormModal';
import { ServerStatusPanel } from './ServerStatusPanel';

// Interface para valores de sensores en tiempo real
interface SensorValue {
  value: any;
  timestamp: number;
  flash: boolean;
  machineCode?: string;
  plcCode?: string;
  unit?: string;
}

// Interface para configuración del collector
interface CollectorConfig {
  collector: {
    host: string;
    port: number;
    token: string;
    enabled: boolean;
  };
  mqtt: {
    broker_url: string;
    mqtt_host: string;
    mqtt_port: number;
    topic: string;
    enabled: boolean;
  };
}

// Interface para estadísticas de base de datos (desde MQTT o API)
interface DatabaseStats {
  connected: boolean;
  error?: string;
  // From MQTT system/postgresql
  postgresStats?: PostgreSQLStats;
  // Legacy database info
  database?: {
    status?: string;
    postgres_connected?: boolean;
    db_name?: string;
    db_size?: string;
    readings_count?: number;
    readings_today?: number;
    oldest_reading?: string;
    newest_reading?: string;
    tables?: Record<string, number>;
  };
  inventory?: {
    machines: number;
    plcs: number;
    sensors: number;
  };
  local: {
    machines: number;
    plcs: number;
    sensors: number;
    files?: {
      inventory: { size: number; modified: string };
      config: { size: number; modified: string };
      collector: { size: number; modified: string };
    };
  };
}

export const SettingsPage: React.FC = () => {
  const [plcs, setPlcs] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // MQTT/WebSocket State
  const [mqttStatus, setMqttStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  // PostgreSQL stats from MQTT
  const [postgresStats, setPostgresStats] = useState<PostgreSQLStats | null>(null);
  
  // Valores en tiempo real de sensores
  const [sensorValues, setSensorValues] = useState<Record<string, SensorValue>>({});
  const [messageCount, setMessageCount] = useState(0);
  const [, setTick] = useState(0); // Para forzar re-render cada segundo
  
  const [selectedPlcId, setSelectedPlcId] = useState<string | number>('');
  
  // Modal states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showBackendModal, setShowBackendModal] = useState(false);
  
  // Configuración del collector
  const [collectorConfig, setCollectorConfig] = useState<CollectorConfig | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Database stats
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [loadingDbStats, setLoadingDbStats] = useState(false);

  useEffect(() => {
    loadData();
    loadCollectorConfig();
    loadDatabaseStats();
  }, []);
  
  // Cargar estadísticas de base de datos (initial from API)
  const loadDatabaseStats = async () => {
    setLoadingDbStats(true);
    try {
      const stats = await adminService.getDatabaseStats();
      setDbStats(stats);
    } catch (e) {
      console.error("Error loading database stats:", e);
    } finally {
      setLoadingDbStats(false);
    }
  };
  
  // Cargar configuración del collector (síncrono desde localStorage)
  const loadCollectorConfig = () => {
    try {
      const config = adminService.getCollectorConfig();
      setCollectorConfig(config);
    } catch (e) {
      console.error("Error loading collector config:", e);
    }
  };
  
  // Copiar al portapapeles
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };
  
  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Actualizar tiempo cada segundo para mostrar "hace X segundos"
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Connection status callback
  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log('📡 WebSocket connection status:', connected ? 'connected' : 'disconnected');
    setMqttStatus(connected ? 'connected' : 'disconnected');
  }, []);

  // Auto-connect to WebSocket on load and subscribe to system topics
  useEffect(() => {
    // Register connection status listener
    mqttService.onConnectionChange(handleConnectionChange);
    
    // Subscribe to PostgreSQL status from MQTT
    mqttService.onPostgreSQLStatus((stats) => {
      console.log('📊 PostgreSQL status from MQTT:', stats);
      setPostgresStats(stats);
    });
    
    const connectWs = async () => {
      setMqttStatus('connecting');
      try {
        // Get WebSocket URL and token from config
        const config = adminService.getCollectorConfig();
        const host = config.collector?.host || '10.147.18.10';
        const port = config.collector?.port || 8000;
        const token = config.collector?.token || '';
        const wsUrl = `ws://${host}:${port}/ws/realtime`;
        
        console.log('🔌 Connecting to WebSocket:', wsUrl, 'with token:', token ? 'yes' : 'no');
        await mqttService.connect(wsUrl, token);
        // Status will be updated by onConnectionChange callback
      } catch (e) {
        console.error("WebSocket Connect error", e);
        setMqttStatus('error');
      }
    };
    
    connectWs();
    
    return () => {
      mqttService.offConnectionChange(handleConnectionChange);
    };
  }, [handleConnectionChange]);

  // WebSocket Subscription - receive real-time sensor values
  useEffect(() => {
    if (mqttStatus === 'connected') {
      console.log('📡 Subscribing to sensor updates...');
      
      // Helper function to update sensor value
      const updateSensorValue = (sensorCode: string, value: any, unit: string, machineCode: string, plcCode: string) => {
        console.log(`📨 Sensor [${sensorCode}] from ${machineCode}/${plcCode}:`, value);
        
        setSensorValues(prev => ({
          ...prev,
          [sensorCode]: {
            value,
            timestamp: Date.now(),
            flash: true,
            machineCode,
            plcCode,
            unit
          }
        }));
        
        setMessageCount(prev => prev + 1);
        
        setTimeout(() => {
          setSensorValues(prev => {
            if (!prev[sensorCode]) return prev;
            return {
              ...prev,
              [sensorCode]: {
                ...prev[sensorCode],
                flash: false
              }
            };
          });
        }, 500);
      };
      
      // Subscribe using wildcard to get ALL sensor data
      // This handles MQTT proxy format: { topic: "machines/...", payload: {...} }
      mqttService.subscribe('*', (payload: any, topic?: string) => {
        // Format 1: MQTT proxy with topic "machines/{machine}/{plc}/{sensor}"
        if (topic && topic.startsWith('machines/')) {
          const parts = topic.split('/');
          if (parts.length >= 4) {
            const machineCode = parts[1];
            const plcCode = parts[2];
            const sensorCode = parts[3];
            
            let displayValue = payload;
            let unit = '';
            if (typeof payload === 'object' && payload !== null) {
              displayValue = payload.value ?? payload.val ?? payload.v ?? JSON.stringify(payload);
              unit = payload.unit || '';
            }
            
            updateSensorValue(sensorCode, displayValue, unit, machineCode, plcCode);
          }
          return;
        }
        
        // Format 2: Direct measurement format { sensor_code, value, unit, ... }
        if (payload && typeof payload === 'object') {
          const sensorCode = payload.sensor_code || payload.sensorCode;
          if (sensorCode) {
            const value = payload.value ?? payload.val ?? payload.v;
            const unit = payload.unit || '';
            // Try to extract machine/plc from sensor_code pattern (e.g., "temperatura_ducto_medida_sec4")
            const machineMatch = sensorCode.match(/_(sec\d+|maq\d+|m\d+)$/i);
            const machineCode = payload.machine || payload.machineCode || (machineMatch ? machineMatch[1] : 'unknown');
            const plcCode = payload.plc || payload.plcCode || 'unknown';
            
            updateSensorValue(sensorCode, value, unit, machineCode, plcCode);
          }
        }
      });
    }
    
    return () => {
      if (mqttStatus === 'connected') {
        mqttService.unsubscribe('machines/#');
      }
    };
  }, [mqttStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plcsData, sensorsData] = await Promise.all([
        adminService.getPLCs(),
        adminService.getSensors()
      ]);
      setPlcs(plcsData);
      setSensors(sensorsData);
      
      if (plcsData.length > 0 && !selectedPlcId) {
        setSelectedPlcId(plcsData[0].id);
      }
    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPLCs = async () => {
    setRefreshing(true);
    try {
      console.log("Starting sync...");
      // Sincronizar inventario desde el collector remoto
      const result = await adminService.syncInventory();
      console.log("Sync result:", result);
      if (result.success) {
        // Recargar datos locales
        console.log("Sync successful, reloading data...");
        await loadData();
        console.log("Data reloaded, PLCs:", plcs.length);
      } else {
        console.error("Sync error:", result.error);
        alert(`Error al sincronizar: ${result.error}`);
      }
    } catch (e) {
      console.error("Error refreshing PLCs", e);
      alert(`Error: ${e}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveInventory = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      console.log("Saving inventory...");
      const result = await adminService.saveInventory(plcs, sensors);
      console.log("Save result:", result);
      if (result.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000); // Ocultar después de 3s
      } else {
        alert(`Error al guardar: ${result.error}`);
      }
    } catch (e) {
      console.error("Error saving inventory", e);
      alert(`Error: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePlcSelect = (plcId: string | number) => {
    setSelectedPlcId(plcId);
  };

  const filteredSensors = sensors.filter(s => String(s.plc_id) === String(selectedPlcId));

  return (
    <div className="space-y-6">
      {/* Config Modal */}
      {showConfigModal && (
        <CollectorConfigModal 
          onClose={() => setShowConfigModal(false)}
          onSave={() => {
            // Recargar datos y configuración después de guardar
            loadData();
            loadCollectorConfig();
          }}
        />
      )}

      {/* Backend Form Modal */}
      {showBackendModal && (
        <BackendFormModal 
          onClose={() => setShowBackendModal(false)}
          onSave={() => {
            setShowBackendModal(false);
            loadData();
          }}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center border-b border-scada-700 pb-4">
        <h2 className="text-2xl font-bold text-white">Configuración del Sistema</h2>
        <div className="flex items-center gap-4">
          {/* Botón Refrescar */}
          <button
            onClick={handleRefreshPLCs}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded bg-scada-700 hover:bg-scada-600 disabled:opacity-50 text-white transition-colors"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Sincronizando...' : 'Refrescar'}
          </button>
          {/* Botón Configuración Backend */}
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white transition-colors"
          >
            <Settings size={16} />
            Configuración
          </button>
        </div>
      </div>

      {/* Server Status Panel */}
      <ServerStatusPanel sensorValues={sensorValues} />
    </div>
  );
};
