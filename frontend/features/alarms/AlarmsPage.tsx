import React, { useEffect, useState } from 'react';
import { BellRing, AlertTriangle, AlertCircle, CheckCircle, Clock, Filter, RefreshCw, ChevronDown } from 'lucide-react';
import { scadaBackendService } from '../../services/scadaBackendService';

export const AlarmsPage: React.FC = () => {
  const [activeAlarms, setActiveAlarms] = useState<any[]>([]);
  const [allAlarms, setAllAlarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterMachine, setFilterMachine] = useState<string>('');
  const [machines, setMachines] = useState<any[]>([]);
  const [view, setView] = useState<'active' | 'all'>('active');

  // Load alarms on mount
  useEffect(() => {
    loadAlarms();
    loadMachines();
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadAlarms, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadMachines = async () => {
    try {
      const machineList = await scadaBackendService.getMachines();
      setMachines(machineList);
    } catch (error) {
      console.error('Error loading machines:', error);
    }
  };

  const loadAlarms = async () => {
    try {
      setLoading(true);
      const [active, all] = await Promise.all([
        scadaBackendService.getActiveAlarms({
          severity: filterSeverity || undefined,
          machineCode: filterMachine || undefined,
        }),
        scadaBackendService.getAlarms({
          severity: filterSeverity || undefined,
          machineCode: filterMachine || undefined,
          limit: 100,
        }),
      ]);
      setActiveAlarms(active);
      setAllAlarms(all);
    } catch (error) {
      console.error('Error loading alarms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-900 border-red-700 text-red-300';
      case 'high':
        return 'bg-orange-900 border-orange-700 text-orange-300';
      case 'medium':
        return 'bg-yellow-900 border-yellow-700 text-yellow-300';
      case 'low':
        return 'bg-blue-900 border-blue-700 text-blue-300';
      default:
        return 'bg-scada-800 border-scada-700 text-scada-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <AlertTriangle size={20} className="text-red-500" />;
      case 'high':
        return <AlertCircle size={20} className="text-orange-500" />;
      case 'medium':
        return <AlertCircle size={20} className="text-yellow-500" />;
      case 'low':
        return <AlertCircle size={20} className="text-blue-500" />;
      default:
        return <AlertCircle size={20} className="text-scada-400" />;
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('es-ES');
    } catch {
      return timestamp;
    }
  };

  const displayAlarms = view === 'active' ? activeAlarms : allAlarms;

  return (
    <div className="flex flex-col h-screen bg-scada-900 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-scada-800 via-scada-800 to-scada-850 border-2 border-scada-600 rounded-xl p-4 shadow-xl mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-scada-700 border border-scada-600 flex items-center justify-center">
              <BellRing size={24} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Centro de Alarmas</h1>
              <p className="text-sm text-scada-400">
                Alarmas activas: <span className="text-red-400 font-bold">{activeAlarms.length}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => loadAlarms()}
            disabled={loading}
            className="px-4 py-2 bg-scada-700 border-2 border-scada-600 text-slate-300 rounded-lg hover:bg-scada-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-scada-800 rounded-lg p-2 border border-scada-700">
          <button
            onClick={() => setView('active')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'active'
                ? 'bg-red-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Activas
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Historial
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-scada-400" />
            <select
              value={filterMachine}
              onChange={(e) => {
                setFilterMachine(e.target.value);
                loadAlarms();
              }}
              className="px-3 py-2 bg-scada-800 border border-scada-700 rounded-lg text-slate-200 text-sm"
            >
              <option value="">Todas las máquinas</option>
              {machines.map((m) => (
                <option key={m.id} value={m.code}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => {
              setFilterSeverity(e.target.value);
              loadAlarms();
            }}
            className="px-3 py-2 bg-scada-800 border border-scada-700 rounded-lg text-slate-200 text-sm"
          >
            <option value="">Todas las severidades</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>
      </div>

      {/* Alarms List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-scada-400">Cargando alarmas...</p>
          </div>
        ) : displayAlarms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <CheckCircle size={48} className="text-green-500" />
            <div className="text-center">
              <p className="text-xl text-white font-semibold">
                {view === 'active' ? 'Sin alarmas activas' : 'Sin alarmas'}
              </p>
              <p className="text-scada-400 text-sm mt-1">
                {view === 'active'
                  ? 'Todo el sistema está funcionando correctamente'
                  : 'No hay registros de alarmas'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayAlarms.map((alarm) => (
              <div
                key={alarm.id}
                className={`border-l-4 rounded-lg p-4 transition hover:shadow-lg ${getSeverityColor(
                  alarm.severity
                )} border border-opacity-50`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon */}
                    <div className="mt-1">{getSeverityIcon(alarm.severity)}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm md:text-base">
                          {alarm.alarm_name || 'Sin nombre'}
                        </h3>
                        <span className="text-xs px-2 py-1 bg-black bg-opacity-30 rounded">
                          {alarm.alarm_code || 'N/A'}
                        </span>
                        <span className="text-xs px-2 py-1 bg-black bg-opacity-30 rounded capitalize">
                          {alarm.severity || 'unknown'}
                        </span>
                      </div>

                      <p className="text-xs md:text-sm mt-2 opacity-80">
                        Máquina: <span className="font-semibold">{alarm.machine_name || alarm.machine_code}</span>
                      </p>

                      {alarm.sensor_name && (
                        <p className="text-xs md:text-sm opacity-75">
                          Sensor: {alarm.sensor_name}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs opacity-75 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          Activada: {formatTime(alarm.timestamp_on)}
                        </span>
                        {alarm.timestamp_off && (
                          <span>Desactivada: {formatTime(alarm.timestamp_off)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="ml-4 text-right">
                    <div
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        alarm.status === 1 || !alarm.timestamp_off
                          ? 'bg-red-500 text-white'
                          : 'bg-green-500 text-white'
                      }`}
                    >
                      {alarm.status === 1 || !alarm.timestamp_off ? 'ACTIVA' : 'RESUELTA'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats (only on active view) */}
      {view === 'active' && activeAlarms.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-scada-800 rounded-lg p-4 border border-scada-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">
              {activeAlarms.filter((a) => a.severity?.toLowerCase() === 'critical').length}
            </p>
            <p className="text-sm text-scada-400">Críticas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">
              {activeAlarms.filter((a) => a.severity?.toLowerCase() === 'high').length}
            </p>
            <p className="text-sm text-scada-400">Altas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {activeAlarms.filter((a) => a.severity?.toLowerCase() === 'medium').length}
            </p>
            <p className="text-sm text-scada-400">Medias</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">
              {activeAlarms.filter((a) => a.severity?.toLowerCase() === 'low').length}
            </p>
            <p className="text-sm text-scada-400">Bajas</p>
          </div>
        </div>
      )}
    </div>
  );
};
