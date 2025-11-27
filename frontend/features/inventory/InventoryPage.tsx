import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { scadaBackendService } from '../../services/scadaBackendService';
import { PLC, Sensor } from '../../types';
import { Server, Cpu, Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';

// Interface para valores de sensores en tiempo real
interface SensorValue {
  value: any;
  timestamp: number;
  flash: boolean;
}

export const InventoryPage: React.FC = () => {
  const [plcs, setPlcs] = useState<PLC[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sensorValues, setSensorValues] = useState<Record<string, SensorValue>>({});
  const [mqttStatus, setMqttStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [messageCount, setMessageCount] = useState(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    loadInventory();
  }, []);

  // Actualizar tiempo cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-connect to WebSocket real-time endpoint
  useEffect(() => {
    const connectWs = async () => {
      setMqttStatus('connecting');
      try {
        // Get WebSocket URL and token from config
        const config = adminService.getCollectorConfig();
        const host = config.collector?.host || '10.147.18.10';
        const port = config.collector?.port || 8000;
        const token = config.collector?.token || '';
        const wsUrl = `ws://${host}:${port}/ws/realtime`;
        
        console.log('🔌 Inventory: Connecting to WebSocket:', wsUrl);
        await mqttService.connect(wsUrl, token);
        setMqttStatus('connected');
      } catch (e) {
        console.error("WebSocket Connect error", e);
        setMqttStatus('error');
      }
    };
    connectWs();
  }, []);

  // WebSocket Subscription for real-time sensor data
  useEffect(() => {
    if (mqttStatus === 'connected') {
      console.log('📡 Inventory: Subscribing to sensor updates...');
      
      // Subscribe to all sensor updates via wildcard
      mqttService.subscribe('machines/#', (payload: any, topic?: string) => {
        // Topic format: machines/{machine_code}/{plc_code}/{sensor_code}
        const parts = topic?.split('/') || [];
        
        if (parts.length >= 4) {
          const sensorCode = parts[3];
          
          let displayValue = payload;
          if (typeof payload === 'object' && payload !== null) {
            displayValue = payload.value ?? payload.val ?? payload.v ?? JSON.stringify(payload);
          } else if (typeof payload === 'string') {
            const parsed = parseFloat(payload);
            if (!isNaN(parsed)) {
              displayValue = parsed;
            }
          }
          
          setSensorValues(prev => ({
            ...prev,
            [sensorCode]: {
              value: displayValue,
              timestamp: Date.now(),
              flash: true
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
        }
      });
    }
    
    return () => {
      if (mqttStatus === 'connected') {
        mqttService.unsubscribe('machines/#');
      }
    };
  }, [mqttStatus]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const [plcsData, sensorsData] = await Promise.all([
        adminService.getPLCs(),
        adminService.getSensors()
      ]);
      setPlcs(plcsData);
      setSensors(sensorsData);
    } catch (error) {
      console.error("Failed to load inventory", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Inventario del Sistema</h1>
        <div className="flex items-center gap-4">
          {mqttStatus === 'connected' && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">
              <Activity size={16} className="animate-pulse" />
              <span className="text-sm font-medium">{messageCount} msgs</span>
            </div>
          )}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            mqttStatus === 'connected' ? 'bg-green-500/20 text-green-400' : 
            mqttStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' : 
            'bg-red-500/20 text-red-400'
          }`}>
            {mqttStatus === 'connected' ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className="text-sm font-medium">
              {mqttStatus === 'connected' ? 'MQTT Online' : mqttStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
            </span>
          </div>
          <button 
            onClick={loadInventory} 
            disabled={loading}
            className="p-2 bg-scada-700 rounded-lg hover:bg-scada-600 disabled:opacity-50 text-white transition-colors"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* PLCs Section */}
      <div className="bg-scada-800 rounded-xl border border-scada-700 overflow-hidden">
        <div className="p-4 border-b border-scada-700 flex items-center gap-2">
          <Server className="text-blue-400" />
          <h2 className="text-lg font-semibold text-white">PLCs ({plcs.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-scada-900/50 text-slate-200 uppercase font-medium">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Dirección IP</th>
                <th className="px-4 py-3">Puerto</th>
                <th className="px-4 py-3">Protocolo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-scada-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <RefreshCw size={24} className="animate-spin mx-auto text-scada-500" />
                  </td>
                </tr>
              ) : plcs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No hay PLCs configurados</td>
                </tr>
              ) : (
                plcs.map((plc) => (
                  <tr key={plc.id} className="hover:bg-scada-700/50 transition-colors">
                    <td className="px-4 py-3 font-mono">{plc.id}</td>
                    <td className="px-4 py-3 text-white font-medium">{plc.name}</td>
                    <td className="px-4 py-3 font-mono text-blue-400">{plc.code}</td>
                    <td className="px-4 py-3 font-mono">{plc.ip_address || plc.ip}</td>
                    <td className="px-4 py-3 font-mono">{plc.port}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                        {plc.protocol || 'Modbus'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sensors Section */}
      <div className="bg-scada-800 rounded-xl border border-scada-700 overflow-hidden">
        <div className="p-4 border-b border-scada-700 flex items-center gap-2">
          <Activity className="text-green-400" />
          <h2 className="text-lg font-semibold text-white">Sensores ({sensors.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-scada-900/50 text-slate-200 uppercase font-medium">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">PLC</th>
                <th className="px-4 py-3 text-right">Valor Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-scada-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <RefreshCw size={24} className="animate-spin mx-auto text-scada-500" />
                  </td>
                </tr>
              ) : sensors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No hay sensores configurados</td>
                </tr>
              ) : (
                sensors.map((sensor) => {
                  const sensorKey = sensor.code;
                  const liveData = sensorValues[sensorKey];
                  const hasValue = liveData?.value !== undefined;
                  const rawValue = hasValue ? liveData.value : null;
                  const isFlashing = liveData?.flash;
                  
                  let displayValue = '--';
                  if (hasValue) {
                    if (typeof rawValue === 'number') {
                      displayValue = rawValue.toFixed(sensor.precision ?? 2);
                    } else if (typeof rawValue === 'string') {
                      if (rawValue === sensorKey) {
                        displayValue = '●';
                      } else {
                        displayValue = rawValue;
                      }
                    } else {
                      displayValue = String(rawValue);
                    }
                  }
                  
                  const plcName = plcs.find(p => p.id === sensor.plc_id)?.name || sensor.plc_id;
                  
                  return (
                    <tr key={sensor.id} className={`hover:bg-scada-700/50 transition-all ${isFlashing ? 'bg-green-500/10' : ''}`}>
                      <td className="px-4 py-3 font-mono">{sensor.id}</td>
                      <td className="px-4 py-3 text-white font-medium">{sensor.name}</td>
                      <td className="px-4 py-3 font-mono text-green-400">{sensorKey}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          sensor.type === 'temperature' ? 'bg-orange-500/20 text-orange-400' :
                          sensor.type === 'humidity' ? 'bg-blue-500/20 text-blue-400' :
                          sensor.type === 'digital' || sensor.data_type === 'bool' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {sensor.type || sensor.data_type || 'analog'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{sensor.unit || '-'}</td>
                      <td className="px-4 py-3 text-slate-300">{plcName}</td>
                      <td className={`px-4 py-3 text-right font-mono text-lg transition-all ${
                        isFlashing ? 'text-green-400 scale-105' : hasValue ? 'text-white' : 'text-slate-600'
                      }`}>
                        {displayValue}
                        {sensor.unit && typeof rawValue === 'number' && (
                          <span className="text-sm ml-1 text-slate-500">{sensor.unit}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
