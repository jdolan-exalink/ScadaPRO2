import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { adminService } from '../../services/adminService';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Download, Calendar, Filter, RefreshCw } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { currentBackend } = useAppContext();
  const [sensors, setSensors] = useState<any[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<string | number>('');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h'); // '24h', '7d', '30d'

  useEffect(() => {
    loadSensors();
  }, []);

  useEffect(() => {
    if (selectedSensorId) {
      loadHistory();
    }
  }, [selectedSensorId, timeRange]);

  const loadSensors = async () => {
    const data = await adminService.getSensors();
    setSensors(data);
    if (data.length > 0 && !selectedSensorId) {
      setSelectedSensorId(data[0].id);
    }
  };

  const loadHistory = async () => {
    if (!selectedSensorId) return;
    setLoading(true);
    
    const now = new Date();
    let fromDate = new Date();
    
    switch (timeRange) {
      case '24h': fromDate.setHours(now.getHours() - 24); break;
      case '7d': fromDate.setDate(now.getDate() - 7); break;
      case '30d': fromDate.setDate(now.getDate() - 30); break;
    }

    try {
      const data = await adminService.getSensorHistory(
        selectedSensorId, 
        fromDate.toISOString(), 
        now.toISOString()
      );
      
      // Format data for chart
      const formattedData = data.map((d: any) => ({
        time: new Date(d.timestamp).toLocaleString(),
        value: d.value,
        originalTimestamp: d.timestamp
      }));
      
      setHistoryData(formattedData);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedSensor = () => sensors.find(s => s.id === selectedSensorId);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-scada-700 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Historial de Datos</h2>
          <p className="text-slate-400 mt-1">Análisis para backend: <span className="text-scada-500 font-mono">{currentBackend?.name || 'Industrial'}</span></p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
           <select 
             className="bg-scada-800 border border-scada-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-scada-500"
             value={selectedSensorId}
             onChange={(e) => setSelectedSensorId(e.target.value)}
           >
             {sensors.map(s => (
               <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
             ))}
           </select>

           <div className="flex bg-scada-800 border border-scada-700 rounded overflow-hidden">
             <button 
               onClick={() => setTimeRange('24h')}
               className={`px-3 py-2 text-sm ${timeRange === '24h' ? 'bg-scada-600 text-white' : 'text-slate-400 hover:text-white'}`}
             >
               24h
             </button>
             <button 
               onClick={() => setTimeRange('7d')}
               className={`px-3 py-2 text-sm ${timeRange === '7d' ? 'bg-scada-600 text-white' : 'text-slate-400 hover:text-white'}`}
             >
               7d
             </button>
           </div>

           <button 
             onClick={loadHistory}
             className="p-2 bg-scada-800 border border-scada-700 rounded hover:bg-scada-700 text-slate-300"
             title="Recargar"
           >
             <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      <div className="flex-1 bg-scada-800 border border-scada-700 rounded-xl p-4 md:p-6 min-h-[400px] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-slate-200">
            {getSelectedSensor()?.name || 'Seleccione un sensor'} 
            <span className="text-slate-500 text-sm ml-2">({getSelectedSensor()?.unit})</span>
          </h3>
          {historyData.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500">Último valor</p>
              <p className="text-xl font-bold text-white">
                {historyData[historyData.length - 1].value} {getSelectedSensor()?.unit}
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 w-full h-full min-h-[300px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              <RefreshCw className="animate-spin mr-2" /> Cargando datos...
            </div>
          ) : historyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              No hay datos disponibles para el rango seleccionado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8" 
                  tick={{fontSize: 12}}
                  minTickGap={50}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name={getSelectedSensor()?.name || 'Valor'}
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};