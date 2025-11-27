
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../App';
import { MqttErrorDisplay } from '../../components/MqttErrorDisplay';
import { scadaBackendService } from '../../services/scadaBackendService';
import { Machine, DashboardMetric } from '../../types';
import { Activity, AlertTriangle, Clock, Power, Settings2, Maximize, Minimize, Save, X, Plus, Trash2, GripHorizontal, Palette } from 'lucide-react';

interface GroupDef {
  name: string;
  color: string;
}

export const Dashboard: React.FC = () => {
  const { currentBackend } = useAppContext();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [mqttConnected, setMqttConnected] = useState(false);
  
  // Config State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configMetrics, setConfigMetrics] = useState<DashboardMetric[]>([]);
  const [definedGroups, setDefinedGroups] = useState<GroupDef[]>([]);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();

  const loadData = async () => {
    if (!currentBackend) return;
    setLoading(true);
    try {
        const [m] = await Promise.all([
            scadaBackendService.getMachines()
        ]);
        setMachines(m);
        
        // For now, create basic metrics from machines and their sensors
        // In production, you'd have a dedicated dashboard metrics endpoint
        const metrics: DashboardMetric[] = [];
        for (const machine of m) {
          const sensors = await scadaBackendService.getSensors();
          const machineSensors = sensors.filter(s => s.machine_id === machine.id).slice(0, 4);
          
          machineSensors.forEach((sensor, idx) => {
            metrics.push({
              id: `${machine.id}-${sensor.id}`,
              label: sensor.description || sensor.name,
              machineName: machine.name,
              groupColor: '#3b82f6',
              unit: sensor.unit || '',
              setPoint: 0,
              value: sensor.last_value || 0,
              tolerance: 5
            });
          });
        }
        setMetrics(metrics);
        setMqttConnected(m.length > 0);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  // MQTT reconnect handler
  const handleMqttReconnect = async () => {
    try {
      const response = await fetch('/api/mqtt/reconnect', { method: 'POST' });
      if (response.ok) {
        // Reload data after reconnect
        setTimeout(() => loadData(), 2000);
      }
    } catch (error) {
      console.error('Error reconnecting MQTT:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentBackend]);

  // Simulación de datos en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
       setMetrics(prev => prev.map(m => {
          const change = (Math.random() - 0.5) * 1.5;
          return { ...m, value: parseFloat((m.value + change).toFixed(1)) };
       }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };
  
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // --- Lógica de Agrupación para UI ---
  // Extraemos grupos únicos y su color desde los datos
  const groupedMetrics = metrics.reduce((acc, metric) => {
      const groupName = metric.machineName || 'Sin Asignar';
      if (!acc[groupName]) acc[groupName] = { metrics: [], color: metric.groupColor || '#3b82f6' };
      acc[groupName].metrics.push(metric);
      acc[groupName].color = metric.groupColor || acc[groupName].color; // Ensure latest color
      return acc;
  }, {} as Record<string, { metrics: DashboardMetric[], color: string }>);


  // --- MANEJO DEL CONFIGURADOR ---
  const handleOpenConfig = () => {
      // 1. Clonar métricas
      setConfigMetrics(JSON.parse(JSON.stringify(metrics)));
      
      // 2. Extraer grupos únicos para la grilla de definición
      const uniqueNames = Array.from(new Set(metrics.map(m => m.machineName))) as string[];
      const groups: GroupDef[] = uniqueNames.map(name => {
         const found = metrics.find(m => m.machineName === name);
         return { name, color: found?.groupColor || '#3b82f6' };
      });
      setDefinedGroups(groups);
      
      setIsConfigOpen(true);
  };

  const handleUpdateGroupDef = (idx: number, field: keyof GroupDef, val: string) => {
      const oldName = definedGroups[idx].name;
      const newGroups = [...definedGroups];
      newGroups[idx] = { ...newGroups[idx], [field]: val };
      setDefinedGroups(newGroups);

      // Si cambiamos el nombre, actualizar todas las métricas asociadas
      if (field === 'name') {
         setConfigMetrics(prev => prev.map(m => m.machineName === oldName ? { ...m, machineName: val } : m));
      }
      // Si cambiamos color, actualizar métricas
      if (field === 'color') {
         setConfigMetrics(prev => prev.map(m => m.machineName === oldName ? { ...m, groupColor: val } : m));
      }
  };

  const handleAddGroup = () => {
      setDefinedGroups([...definedGroups, { name: `Nuevo Grupo ${definedGroups.length + 1}`, color: '#3b82f6' }]);
  };

  const handleDeleteGroup = (name: string) => {
      if(confirm(`¿Borrar grupo "${name}" y sus sensores?`)) {
          setDefinedGroups(prev => prev.filter(g => g.name !== name));
          setConfigMetrics(prev => prev.filter(m => m.machineName !== name));
      }
  };

  const handleSaveConfig = async () => {
      // 1. Identificar eliminados
      const currentIds = configMetrics.map(c => c.id);
      const originalIds = metrics.map(m => m.id);
      const toDelete = originalIds.filter(id => !currentIds.includes(id));
      
      for(const id of toDelete) {
          await iotService.deleteDashboardMetric(id);
      }

      // 2. Guardar nuevos/editados
      for (const m of configMetrics) {
          // Asegurar que el color sea consistente con el grupo definido
          const groupDef = definedGroups.find(g => g.name === m.machineName);
          const metricToSave = { ...m, groupColor: groupDef?.color || m.groupColor };

          if (originalIds.includes(m.id)) {
              await iotService.updateDashboardMetric(m.id, metricToSave);
          } else {
              await iotService.addDashboardMetric(metricToSave);
          }
      }

      await loadData();
      setIsConfigOpen(false);
  };

  const addNewMetric = () => {
      const defaultGroup = definedGroups[0]?.name || 'Sin Asignar';
      const defaultColor = definedGroups[0]?.color || '#3b82f6';
      
      const newM: DashboardMetric = {
          id: `new-${Date.now()}`,
          label: 'Nuevo Sensor',
          machineName: defaultGroup,
          groupColor: defaultColor,
          unit: 'Unidad',
          setPoint: 0,
          value: 0,
          tolerance: 0
      };
      setConfigMetrics([...configMetrics, newM]);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <div className="flex flex-col items-center gap-2">
        <Activity className="animate-spin" />
        <span>Cargando tablero...</span>
      </div>
    </div>
  );

  if (metrics.length === 0) {
    return <MqttErrorDisplay mqttConnected={mqttConnected} onReconnect={handleMqttReconnect} />;
  }

  return (
    <div 
        ref={containerRef}
        className={`flex flex-col h-full space-y-8 ${isFullscreen ? 'bg-scada-900 p-6 overflow-y-auto h-screen w-screen fixed top-0 left-0 z-50' : ''}`}
    >
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center border-b border-scada-700 pb-4 shrink-0">
        <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <GripHorizontal className="text-scada-500" size={24} />
              Paneles de Proceso
            </h2>
            <p className="text-xs text-slate-400">Vista de operaciones en tiempo real</p>
        </div>
        
        <div className="flex gap-2">
             <button onClick={toggleFullscreen} className="btn-secondary">
                {isFullscreen ? <Minimize size={14}/> : <Maximize size={14} />}
                {isFullscreen ? 'Salir' : 'Pantalla Completa'}
             </button>
             <button onClick={handleOpenConfig} className="btn-secondary">
                <Settings2 size={14} /> Configurar Paneles
            </button>
        </div>
      </div>

      {/* --- PANELES VISUALES --- */}
      <div className="grid grid-cols-1 gap-8 pb-10">
        {(Object.entries(groupedMetrics) as [string, {metrics: DashboardMetric[], color: string}][]).map(([machineName, groupData]) => (
            <div 
                key={machineName} 
                className="bg-scada-800 rounded-xl border border-scada-600 shadow-xl overflow-hidden"
                style={{ borderColor: `${groupData.color}40` }} // 40 = 25% opacity
            >
                {/* Cabecera del Panel */}
                <div 
                    className="px-6 py-3 border-b flex justify-between items-center"
                    style={{ 
                        backgroundColor: `${groupData.color}15`, // 10% opacity bg
                        borderColor: `${groupData.color}30` 
                    }}
                >
                    <h3 className="text-lg font-bold text-white tracking-wide uppercase flex items-center gap-3">
                        <div className="w-1.5 h-6 rounded-sm" style={{ backgroundColor: groupData.color }}></div>
                        {machineName}
                    </h3>
                    <span className="text-xs font-mono text-slate-400 bg-black/20 px-2 py-1 rounded">
                        {groupData.metrics.length} Variables
                    </span>
                </div>

                {/* Grilla 4 Columnas */}
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {groupData.metrics.map((metric) => {
                            const diff = metric.value - metric.setPoint;
                            const isAlarm = Math.abs(diff) > metric.tolerance;
                            
                            return (
                            <div 
                                key={metric.id}
                                className={`
                                relative rounded-lg border-2 p-4 transition-all duration-300 flex flex-col justify-between min-h-[140px]
                                ${isAlarm 
                                    ? 'bg-red-950/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                                    : 'bg-scada-900 border-scada-700/50 hover:border-scada-500'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-slate-300 text-sm font-bold uppercase truncate w-3/4" title={metric.label}>
                                        {metric.label}
                                    </span>
                                    {isAlarm && <AlertTriangle className="text-red-500 animate-pulse shrink-0" size={20} />}
                                </div>

                                <div className="flex items-baseline gap-1 my-1">
                                    <span className={`text-4xl font-mono font-bold tracking-tighter ${isAlarm ? 'text-red-400' : 'text-white'}`}>
                                        {metric.value.toFixed(1)}
                                    </span>
                                    <span className="text-sm text-slate-500 font-medium">{metric.unit}</span>
                                </div>

                                <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                                    <div className="flex flex-col">
                                        <span className="text-slate-500 text-[10px] uppercase">Set</span>
                                        <span className="text-slate-300">{metric.setPoint}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                         <span className="text-slate-500 text-[10px] uppercase">Desv.</span>
                                         <div className={`flex items-center gap-1 ${Math.abs(diff) > metric.tolerance ? 'text-red-400 font-bold' : 'text-emerald-500'}`}>
                                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* --- EDITOR DE PANELES (MODAL) --- */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-scada-800 border border-scada-600 rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col">
                
                <div className="flex justify-between items-center p-5 border-b border-scada-700 bg-scada-900 rounded-t-xl">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Settings2 size={24} className="text-scada-500" /> Configuración de Tablero
                        </h3>
                        <p className="text-slate-400 text-sm">Defina primero los grupos/máquinas y luego asigne los sensores.</p>
                    </div>
                    <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-white p-2"><X size={24}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-scada-900/50 flex flex-col gap-8">
                    
                    {/* PASO 1: DEFINIR GRUPOS */}
                    <div className="bg-scada-800/50 p-6 rounded-lg border border-scada-700">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="bg-scada-500 text-white text-xs font-bold px-2 py-1 rounded">PASO 1</span>
                                Definir Grupos y Estilos
                            </h4>
                            <button onClick={handleAddGroup} className="text-xs flex items-center gap-1 bg-scada-700 hover:bg-scada-600 text-white px-3 py-1.5 rounded">
                                <Plus size={14} /> Crear Grupo
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {definedGroups.map((group, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-scada-900 p-3 rounded border border-scada-700">
                                    <input 
                                        type="color" 
                                        value={group.color}
                                        onChange={(e) => handleUpdateGroupDef(idx, 'color', e.target.value)}
                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                        title="Color del Panel"
                                    />
                                    <input 
                                        type="text" 
                                        value={group.name}
                                        onChange={(e) => handleUpdateGroupDef(idx, 'name', e.target.value)}
                                        className="flex-1 bg-transparent text-white font-bold outline-none border-b border-transparent focus:border-scada-500 px-1"
                                        placeholder="Nombre Máquina..."
                                    />
                                    <button onClick={() => handleDeleteGroup(group.name)} className="text-slate-500 hover:text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PASO 2: ASIGNAR SENSORES */}
                    <div className="bg-scada-800/50 p-6 rounded-lg border border-scada-700 flex-1">
                        <div className="flex justify-between items-center mb-4">
                             <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="bg-scada-500 text-white text-xs font-bold px-2 py-1 rounded">PASO 2</span>
                                Asignar Sensores a Grupos
                            </h4>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs uppercase text-slate-500 border-b border-scada-700">
                                        <th className="pb-3 pl-2 w-1/4">Grupo / Máquina (Seleccionar)</th>
                                        <th className="pb-3 w-1/4">Etiqueta Sensor</th>
                                        <th className="pb-3 text-center w-24">Unidad</th>
                                        <th className="pb-3 w-24">Set Point</th>
                                        <th className="pb-3 w-24">Tolerancia</th>
                                        <th className="pb-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-scada-700/50">
                                    {configMetrics.map((metric, mIdx) => (
                                        <tr key={metric.id} className="group hover:bg-scada-800 transition-colors">
                                            <td className="py-2 pl-2">
                                                <select 
                                                    value={metric.machineName}
                                                    onChange={(e) => {
                                                        const newMetrics = [...configMetrics];
                                                        newMetrics[mIdx] = { 
                                                            ...newMetrics[mIdx], 
                                                            machineName: e.target.value,
                                                            groupColor: definedGroups.find(g => g.name === e.target.value)?.color // Sync color
                                                        };
                                                        setConfigMetrics(newMetrics);
                                                    }}
                                                    className="w-full bg-scada-900 border border-scada-700 rounded px-2 py-1.5 text-white outline-none focus:border-scada-500"
                                                >
                                                    {definedGroups.map(g => (
                                                        <option key={g.name} value={g.name}>{g.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-2 pr-2">
                                                <input 
                                                    type="text" 
                                                    value={metric.label}
                                                    onChange={(e) => {
                                                        const nm = [...configMetrics];
                                                        nm[mIdx].label = e.target.value;
                                                        setConfigMetrics(nm);
                                                    }}
                                                    className="w-full bg-transparent border-b border-scada-700 focus:border-scada-500 px-2 py-1 text-slate-300 outline-none"
                                                />
                                            </td>
                                            <td className="py-2 text-center">
                                                <input 
                                                    type="text" 
                                                    value={metric.unit}
                                                    onChange={(e) => {
                                                        const nm = [...configMetrics];
                                                        nm[mIdx].unit = e.target.value;
                                                        setConfigMetrics(nm);
                                                    }}
                                                    className="w-16 bg-transparent border-b border-scada-700 focus:border-scada-500 px-1 py-1 text-slate-400 text-center outline-none"
                                                />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <input 
                                                    type="number" step="0.1"
                                                    value={metric.setPoint}
                                                    onChange={(e) => {
                                                        const nm = [...configMetrics];
                                                        nm[mIdx].setPoint = parseFloat(e.target.value);
                                                        setConfigMetrics(nm);
                                                    }}
                                                    className="w-full bg-scada-900 border border-scada-700 rounded px-2 py-1 text-white text-right outline-none"
                                                />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <input 
                                                    type="number" step="0.1"
                                                    value={metric.tolerance}
                                                    onChange={(e) => {
                                                        const nm = [...configMetrics];
                                                        nm[mIdx].tolerance = parseFloat(e.target.value);
                                                        setConfigMetrics(nm);
                                                    }}
                                                    className="w-full bg-scada-900 border border-scada-700 rounded px-2 py-1 text-white text-right outline-none"
                                                />
                                            </td>
                                            <td className="py-2 text-center">
                                                <button 
                                                    onClick={() => {
                                                        setConfigMetrics(prev => prev.filter(m => m.id !== metric.id));
                                                    }}
                                                    className="text-slate-600 hover:text-red-500 p-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button 
                            onClick={addNewMetric}
                            className="mt-4 w-full py-3 border-2 border-dashed border-scada-700 rounded-lg text-slate-500 hover:text-white hover:border-scada-500 hover:bg-scada-800 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> Agregar Nuevo Sensor
                        </button>
                    </div>
                </div>

                <div className="p-5 border-t border-scada-700 flex justify-end gap-3 bg-scada-800 rounded-b-xl">
                    <button 
                        onClick={() => setIsConfigOpen(false)}
                        className="px-6 py-2 rounded-lg text-slate-300 hover:bg-scada-700 border border-transparent"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSaveConfig}
                        className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2 transform active:scale-95 transition-all"
                    >
                        <Save size={18} /> Guardar y Aplicar
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Helper Styles for buttons */}
      <style>{`
        .btn-secondary {
            @apply text-xs flex items-center gap-1 text-slate-400 hover:text-white bg-scada-800 border border-scada-700 px-3 py-1.5 rounded transition-colors;
        }
      `}</style>
    </div>
  );
};
