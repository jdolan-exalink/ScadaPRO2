import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../App';
import { MqttErrorDisplay } from '../../components/MqttErrorDisplay';
import { ModernGaugeWidget } from './widgets/ModernGaugeWidget';
import { ModernSwitchWidget } from './widgets/ModernSwitchWidget';
import { 
  Maximize, Minimize, ChevronDown, Activity, Cpu, Zap, 
  Clock, Radio, Server, RefreshCw, X, TrendingUp, 
  Thermometer, Gauge, ToggleLeft, Hash, Droplets, Wind
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Types for live data
interface ConnectedMachine {
  code: string;
  plcCode: string;
  sensors: string[];
  sensorCount: number;
  lastSeen: string;
  messageCount: number;
  isActive: boolean;
}

interface SensorValue {
  value: number;
  timestamp: string | number;
  unit: string;
  machineCode: string;
  plcCode: string;
  raw_value?: number;
  display_value?: string;
  flash?: boolean;
}

interface HistoryDatapoint {
  timestamp: string;
  value: number;
}

interface MachinesResponse {
  machines: ConnectedMachine[];
  summary: {
    totalMachines: number;
    activeMachines: number;
    totalSensors: number;
    totalMessages: number;
    uptime: number;
  };
}

interface SensorValuesResponse {
  sensors: Record<string, SensorValue>;
  count: number;
  timestamp: number;
}

// API URL base - usar ruta relativa para que pase por el proxy de Vite
const API_BASE = '';

export const MachineDetailLive: React.FC = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();
  const { currentBackend } = useAppContext();
  
  const [machines, setMachines] = useState<ConnectedMachine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<ConnectedMachine | null>(null);
  const [sensorValues, setSensorValues] = useState<Record<string, SensorValue>>({});
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // History modal state
  const [historyModal, setHistoryModal] = useState<{
    open: boolean;
    sensorCode: string;
    data: HistoryDatapoint[];
    loading: boolean;
    hours: number;
  }>({ open: false, sensorCode: '', data: [], loading: false, hours: 6 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch connected machines from MQTT registry
  const fetchMachines = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/machines/connected`);
      if (!response.ok) throw new Error('Failed to fetch machines');
      const data: MachinesResponse = await response.json();
      console.log('Machines fetched:', data.machines.length, data.machines.map(m => m.code));
      setMachines(data.machines);
      
      // Check actual MQTT status from backend
      try {
        const statusResponse = await fetch(`${API_BASE}/api/mqtt/stats`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setMqttConnected(statusData.connected === true);
        } else {
          // If we got machines, MQTT is likely connected
          setMqttConnected(data.machines.length > 0);
        }
      } catch {
        // If status check fails but we got machines, consider connected
        setMqttConnected(data.machines.length > 0);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
      setMqttConnected(false);
    }
  }, []);

  // Fetch live sensor values
  const fetchSensorValues = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sensors/values`);
      if (!response.ok) throw new Error('Failed to fetch sensor values');
      const data: SensorValuesResponse = await response.json();
      setSensorValues(data.sensors);
      setLastUpdate(new Date());
      console.log('Sensor values updated:', Object.keys(data.sensors).length, 'sensors');
    } catch (error) {
      console.error('Error fetching sensor values:', error);
    }
  }, []);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchMachines(), fetchSensorValues()]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // MQTT reconnect handler
  const handleMqttReconnect = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/mqtt/reconnect`, { method: 'POST' });
      if (response.ok) {
        // Wait a bit and check status
        setTimeout(() => fetchMachines(), 2000);
      }
    } catch (error) {
      console.error('Error reconnecting MQTT:', error);
    }
  };

  // Fetch sensor history from PostgreSQL
  const fetchSensorHistory = async (sensorCode: string, hours: number = 6) => {
    setHistoryModal(prev => ({ ...prev, open: true, sensorCode, loading: true, data: [], hours }));
    
    try {
      // Fetch sensor history using correct endpoint format
      const response = await fetch(`${API_BASE}/api/sensors/${sensorCode}/history?hours=${hours}`);
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      setHistoryModal(prev => ({ ...prev, data: data.history || [], loading: false }));
    } catch (error) {
      console.error('Error fetching sensor history:', error);
      setHistoryModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Change time range for history
  const changeHistoryTimeRange = (hours: number) => {
    if (historyModal.sensorCode) {
      fetchSensorHistory(historyModal.sensorCode, hours);
    }
  };

  // Initial load and polling
  useEffect(() => {
    setLoading(true);
    
    const init = async () => {
      await fetchMachines();
      await fetchSensorValues();
      setLoading(false);
    };
    
    init();
    
    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchMachines();
      fetchSensorValues();
    }, 2000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Update selected machine when URL changes or redirect to first machine
  useEffect(() => {
    if (machines.length > 0) {
      if (machineId) {
        // URL has a machineId, select that machine
        const machine = machines.find(m => m.code === machineId);
        if (machine && machine.code !== selectedMachine?.code) {
          console.log('URL changed, selecting machine:', machineId);
          setSelectedMachine(machine);
        }
      } else {
        // No machineId in URL, redirect to first machine
        const firstMachine = machines[0];
        console.log('No machine in URL, redirecting to first machine:', firstMachine.code);
        navigate(`/machines/${firstMachine.code}`, { replace: true });
      }
    }
  }, [machineId, machines, navigate]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleMachineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    navigate(`/machines/${code}`);
  };

  // Filter sensors for selected machine
  const machineSensors: [string, SensorValue][] = selectedMachine 
    ? Object.entries(sensorValues).filter(([code, data]) => 
        (data as SensorValue).machineCode === selectedMachine.code
      ) as [string, SensorValue][]
    : [];

  // Categorize sensors by type
  const getSensorType = (code: string, data?: SensorValue): 'boolean' | 'temperature' | 'humidity' | 'velocity' | 'pressure' | 'generic' => {
    const lowerCode = code.toLowerCase();
    
    // FIRST: Check for boolean sensors by name patterns (falla, alarma, etc. should be boolean even if they contain temp/humed)
    if (lowerCode.includes('falla') || lowerCode.includes('alarma') || lowerCode.includes('error') ||
        lowerCode.includes('bool') || lowerCode.includes('dig') || lowerCode.includes('switch') || 
        lowerCode.includes('estado') || lowerCode.includes('activo') || lowerCode.includes('enable') ||
        lowerCode.includes('arranque') || lowerCode.includes('comando') || lowerCode.includes('deshielo') || 
        lowerCode.includes('calor') || lowerCode.includes('aire') || lowerCode.includes('marcha') || 
        lowerCode.includes('paro') || lowerCode.includes('on_off') || lowerCode.includes('start') || 
        lowerCode.includes('stop') || lowerCode.includes('humo') || lowerCode.includes('lluvia') || 
        lowerCode.includes('humectaci') || lowerCode.includes('fr_o') || lowerCode.includes('frio') || 
        lowerCode.includes('pausa') || lowerCode.includes('paso_etapa') || lowerCode.includes('programa_no') ||
        lowerCode.includes('rel_t') || lowerCode.includes('rt_') || lowerCode.includes('_on')) return 'boolean';
    
    // SECOND: Check for analog sensors by name patterns
    const hasTemp = lowerCode.includes('temp');
    const hasHumed = lowerCode.includes('humed');
    const hasMedida = lowerCode.includes('_medida') || lowerCode.includes('medida');
    const hasSet = lowerCode.includes('_set') || lowerCode.includes('set_');
    
    if (hasTemp && (hasMedida || hasSet)) return 'temperature';
    if (hasHumed && (hasMedida || hasSet)) return 'humidity';
    if (lowerCode.includes('vel') || lowerCode.includes('rpm') || lowerCode.includes('speed') || lowerCode.includes('variador')) return 'velocity';
    if (lowerCode.includes('pres') || lowerCode.includes('bar')) return 'pressure';
    
    // THIRD: Check by unit type for analog sensors  
    if (data && data.unit) {
      if (data.unit === '°C' || data.unit === '°F' || data.unit === 'C' || data.unit === 'F') return 'temperature';
      if (data.unit === '%' && hasHumed) return 'humidity';
      if (data.unit === 'RPM' || data.unit === 'rpm') return 'velocity';
      if (data.unit === 'bar' || data.unit === 'psi' || data.unit === 'Pa') return 'pressure';
    }
    
    // FOURTH: Check if it's a boolean value (0 or 1) with no unit
    if (data) {
      const isBoolean = (data.value === 0 || data.value === 1) && 
                        (data.unit === '' || data.unit === 'bool' || !data.unit);
      if (isBoolean) return 'boolean';
    }
    
    return 'generic';
  };

  const getSensorIcon = (code: string, value: SensorValue) => {
    const lowerCode = code.toLowerCase();
    if (lowerCode.includes('temp')) return <Thermometer size={16} className="text-orange-400" />;
    if (lowerCode.includes('pres') || lowerCode.includes('bar')) return <Gauge size={16} className="text-blue-400" />;
    if (lowerCode.includes('rpm') || lowerCode.includes('vel')) return <Activity size={16} className="text-green-400" />;
    if (lowerCode.includes('humed')) return <Droplets size={16} className="text-cyan-400" />;
    if (lowerCode.includes('bool') || lowerCode.includes('dig')) return <ToggleLeft size={16} className="text-purple-400" />;
    return <Hash size={16} className="text-slate-400" />;
  };

  // Separate sensors by type for different display sections
  const booleanSensors = machineSensors.filter(([code, data]) => getSensorType(code, data) === 'boolean');
  const gaugeSensors = machineSensors.filter(([code, data]) => {
    const type = getSensorType(code, data);
    return type === 'temperature' || type === 'humidity' || type === 'velocity' || type === 'pressure';
  });
  const otherSensors = machineSensors.filter(([code, data]) => getSensorType(code, data) === 'generic');

  // Debug log
  console.log('Selected machine:', selectedMachine?.code);
  console.log('Machine sensors count:', machineSensors.length);
  console.log('Boolean sensors:', booleanSensors.length);
  console.log('Gauge sensors:', gaugeSensors.length);
  console.log('Other sensors:', otherSensors.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-scada-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400">Conectando al broker MQTT...</span>
        </div>
      </div>
    );
  }

  // No machines detected
  if (machines.length === 0) {
    return (
      <div>
        <MqttErrorDisplay mqttConnected={mqttConnected} onReconnect={handleMqttReconnect} />
        <div className="flex justify-center mt-6">
          <button 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`px-4 py-2 bg-scada-700 border border-scada-600 rounded-lg text-white hover:bg-scada-600 transition-colors flex items-center gap-2 ${isRefreshing ? 'opacity-50' : ''}`}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`space-y-4 ${isFullscreen ? 'p-6 bg-scada-900 overflow-y-auto' : ''}`}
      style={isFullscreen ? { height: '100vh', width: '100vw' } : {}}
    >
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-scada-800 via-scada-800 to-scada-850 border-2 border-scada-600 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: Machine Selector */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-scada-700 border border-scada-600 flex items-center justify-center">
              <Cpu size={24} className="text-emerald-400" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Sensores en Vivo</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              
              {/* Machine Switcher */}
              <div className="relative mt-1">
                <select 
                  value={selectedMachine?.code || ''}
                  onChange={handleMachineChange}
                  className="appearance-none bg-scada-900 border-2 border-scada-600 text-white py-2 pl-4 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-lg cursor-pointer hover:border-scada-500 transition-colors"
                >
                  {machines.map(m => (
                    <option key={m.code} value={m.code}>
                      {m.code} ({m.sensorCount} sensores)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
          </div>
          
          {/* Center: Status */}
          <div className="hidden lg:flex items-center gap-6">
            <StatusIndicator icon={<Radio size={16} />} label="MQTT" status={mqttConnected ? "online" : "offline"} />
            <StatusIndicator icon={<Activity size={16} />} label={`${machineSensors.length} Sensores`} status="online" />
            <StatusIndicator icon={<Clock size={16} />} label={lastUpdate.toLocaleTimeString()} status="online" />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`p-3 bg-scada-700 border-2 border-scada-600 text-slate-300 rounded-lg hover:bg-scada-600 hover:text-white hover:border-scada-500 transition-all ${isRefreshing ? 'opacity-50' : ''}`}
              title="Refrescar sensores"
            >
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={toggleFullscreen}
              className="p-3 bg-scada-700 border-2 border-scada-600 text-slate-300 rounded-lg hover:bg-scada-600 hover:text-white hover:border-scada-500 transition-all"
              title="Pantalla Completa"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Machine Info with Program Status */}
      {selectedMachine && (() => {
        // Find program, stage and time sensors for this machine
        const machineCode = selectedMachine.code;
        const programaSensor = machineSensors.find(([code]) => code.toLowerCase().startsWith('programa_') && !code.toLowerCase().includes('no_cargado'));
        const etapaSensor = machineSensors.find(([code]) => code.toLowerCase().startsWith('etapa_') && !code.toLowerCase().includes('paso_'));
        const tiempoMedidoSensor = machineSensors.find(([code]) => code.toLowerCase().startsWith('tiempo_medido'));
        
        return (
          <div className="bg-scada-800/50 border border-scada-700 rounded-lg p-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-xs text-slate-500 uppercase font-semibold">Máquina:</span>
                <span className="text-white font-bold">{selectedMachine.code}</span>
                <span className="text-slate-400">|</span>
                
                {/* Programa */}
                {programaSensor && (
                  <>
                    <span className="text-xs text-slate-500">Programa: <span className="text-cyan-400 font-bold">{programaSensor[1].display_value || `Programa ${programaSensor[1].value}`}</span></span>
                    <span className="text-slate-400">|</span>
                  </>
                )}
                
                {/* Etapa */}
                {etapaSensor && (
                  <>
                    <span className="text-xs text-slate-500">Etapa: <span className="text-amber-400 font-bold">{Math.floor(etapaSensor[1].value)} {etapaSensor[1].unit || ''}</span></span>
                    <span className="text-slate-400">|</span>
                  </>
                )}
                
                {/* Tiempo Medido */}
                {tiempoMedidoSensor && (
                  <span className="text-xs text-slate-500">Tiempo: <span className="text-emerald-400 font-bold">{tiempoMedidoSensor[1].display_value || tiempoMedidoSensor[1].value} {tiempoMedidoSensor[1].unit || ''}</span></span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Speedometer Gauges - Temperature, Humidity, Velocity, Pressure */}
      {gaugeSensors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Activity size={18} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Medidores Analógicos</h3>
            <span className="text-xs text-slate-500">({gaugeSensors.length})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {gaugeSensors.map(([code, data]) => {
              const type = getSensorType(code, data);
              // Determine min/max based on sensor type
              let min = 0, max = 100;
              if (type === 'temperature') { min = 0; max = 100; }
              else if (type === 'humidity') { min = 0; max = 100; }
              else if (type === 'velocity') { min = 0; max = 200; }
              else if (type === 'pressure') { min = 0; max = 10; }
              
              return (
                <ModernGaugeWidget
                  key={code}
                  label={code.replace(/_sec21|_sec\d+/gi, '').replace(/_/g, ' ')}
                  value={typeof data.value === 'number' ? data.value : 0}
                  unit={data.unit || ''}
                  min={min}
                  max={max}
                  type={type as 'temperature' | 'humidity' | 'velocity' | 'pressure'}
                  onClick={() => fetchSensorHistory(code)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Modern Switches - Boolean Sensors */}
      {booleanSensors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Zap size={18} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Estados y Señales</h3>
            <span className="text-xs text-slate-500">({booleanSensors.length})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {booleanSensors.map(([code, data]) => (
              <ModernSwitchWidget
                key={code}
                label={code.replace(/_sec21|_sec\d+/gi, '').replace(/_/g, ' ')}
                value={data.value === 1 || data.display_value === 'true'}
                onClick={() => fetchSensorHistory(code)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Sensors - Generic display */}
      {otherSensors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Hash size={18} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Otros Sensores</h3>
            <span className="text-xs text-slate-500">({otherSensors.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {otherSensors.map(([code, data]) => (
              <SensorCard 
                key={code}
                code={code}
                data={data}
                icon={getSensorIcon(code, data)}
                onClickHistory={() => fetchSensorHistory(code)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No sensors message */}
      {machineSensors.length === 0 && selectedMachine && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Zap size={48} className="text-slate-600 mb-4" />
          <h3 className="text-lg text-slate-400">No hay datos de sensores para esta máquina</h3>
          <p className="text-sm text-slate-500 mt-2">Esperando mensajes MQTT...</p>
        </div>
      )}

      {/* History Modal */}
      {historyModal.open && (
        <HistoryModal 
          sensorCode={historyModal.sensorCode}
          data={historyModal.data}
          loading={historyModal.loading}
          hours={historyModal.hours}
          onChangeTimeRange={changeHistoryTimeRange}
          onClose={() => setHistoryModal(prev => ({ ...prev, open: false }))}
        />
      )}
    </div>
  );
};

// Sensor Card Component
const SensorCard: React.FC<{
  code: string;
  data: SensorValue;
  icon: React.ReactNode;
  onClickHistory: () => void;
}> = ({ code, data, icon, onClickHistory }) => {
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(data.value);
  
  useEffect(() => {
    if (data.value !== prevValue.current) {
      setFlash(true);
      prevValue.current = data.value;
      const timer = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [data.value]);

  const isBoolean = data.display_value === 'true' || data.display_value === 'false' || 
                    data.value === 0 || data.value === 1;

  return (
    <div 
      className={`
        bg-gradient-to-b from-scada-800 to-scada-900 
        border-2 border-scada-600 rounded-xl p-4 shadow-xl
        hover:border-scada-500 transition-all cursor-pointer
        ${flash ? 'ring-2 ring-emerald-500/50' : ''}
      `}
      onClick={onClickHistory}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-mono text-slate-400 truncate max-w-[120px]">{code}</span>
        </div>
        <button 
          className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
          title="Ver histórico"
        >
          <TrendingUp size={14} />
        </button>
      </div>
      
      <div className="flex items-baseline gap-2">
        {isBoolean ? (
          <div className={`
            w-4 h-4 rounded-full 
            ${data.value === 1 || data.display_value === 'true' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-600'}
          `} />
        ) : (
          <span className={`text-3xl font-mono font-bold text-white ${flash ? 'text-emerald-400' : ''}`}>
            {typeof data.value === 'number' ? data.value.toFixed(2) : data.value}
          </span>
        )}
        <span className="text-sm text-slate-500">{data.unit}</span>
      </div>
      
      {data.display_value && !isBoolean && (
        <div className="mt-2 text-xs text-slate-400">{data.display_value}</div>
      )}
      
      <div className="mt-3 pt-2 border-t border-scada-700 text-[10px] text-slate-500">
        {new Date(typeof data.timestamp === 'number' ? data.timestamp : Date.parse(data.timestamp)).toLocaleTimeString()}
      </div>
    </div>
  );
};

// History Modal Component
const HistoryModal: React.FC<{
  sensorCode: string;
  data: HistoryDatapoint[];
  loading: boolean;
  hours: number;
  onChangeTimeRange: (hours: number) => void;
  onClose: () => void;
}> = ({ sensorCode, data, loading, hours, onChangeTimeRange, onClose }) => {
  const timeRanges = [
    { label: '6h', value: 6 },
    { label: '12h', value: 12 },
    { label: '24h', value: 24 },
    { label: '1 semana', value: 168 },
    { label: '1 mes', value: 720 },
  ];

  const getTimeRangeLabel = (hours: number) => {
    const range = timeRanges.find(r => r.value === hours);
    return range ? range.label : `${hours}h`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-scada-800 border-2 border-scada-600 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-scada-700">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-emerald-400" size={24} />
            <div>
              <h3 className="text-lg font-bold text-white">Histórico de Sensor</h3>
              <span className="text-xs text-slate-400 font-mono">{sensorCode}</span>
            </div>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <div className="flex bg-scada-900 rounded-lg p-1 gap-1">
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => onChangeTimeRange(range.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    hours === range.value
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-scada-700'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-scada-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4" style={{ height: '400px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-10 h-10 border-4 border-scada-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <TrendingUp size={48} className="mb-4 opacity-50" />
              <p>No hay datos históricos disponibles</p>
              <p className="text-sm text-slate-500 mt-2">Verifica la conexión a PostgreSQL</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#64748b"
                  tickFormatter={(val) => new Date(val).toLocaleTimeString()}
                  fontSize={10}
                />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(val) => new Date(val).toLocaleString()}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={false}
                  name="Valor"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-scada-700 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            {data.length} puntos de datos ({getTimeRangeLabel(hours)})
          </span>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-scada-700 border border-scada-600 text-white rounded-lg hover:bg-scada-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// Status Indicator Component
const StatusIndicator: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  status: 'online' | 'offline' | 'warning';
}> = ({ icon, label, status }) => {
  const statusColors = {
    online: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
    offline: 'text-red-400 bg-red-500/20 border-red-500/30',
    warning: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  };
  
  const dotColors = {
    online: 'bg-emerald-400',
    offline: 'bg-red-400',
    warning: 'bg-amber-400 animate-pulse',
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${statusColors[status]}`}>
      {icon}
      <span className="text-xs font-medium">{label}</span>
      <div className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
    </div>
  );
};

export default MachineDetailLive;
