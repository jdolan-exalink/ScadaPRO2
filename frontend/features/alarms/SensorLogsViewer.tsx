import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { scadaBackendService } from '../../services/scadaBackendService';
import { useAppContext } from '../../App';

interface SensorLog {
  id: number;
  sensor_id: number;
  machine_id: number;
  timestamp: string;
  previous_value: number | null;
  current_value: number;
  variation_percent: number | null;
  severity: string;
  unit: string | null;
  sensor_code: string | null;
  sensor_name: string | null;
  machine_code: string | null;
  machine_name: string | null;
}

interface SensorLogsViewerProps {
  machines: any[];
}

const getSeverityColor = (severity: string) => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-red-900 border-red-700 text-red-300';
    case 'ALERTA':
      return 'bg-orange-900 border-orange-700 text-orange-300';
    case 'NORMAL':
      return 'bg-yellow-900 border-yellow-700 text-yellow-300';
    case 'INFO':
    default:
      return 'bg-blue-900 border-blue-700 text-blue-300';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return <AlertTriangle size={18} className="text-red-400" />;
    case 'ALERTA':
      return <AlertCircle size={18} className="text-orange-400" />;
    case 'NORMAL':
      return <AlertCircle size={18} className="text-yellow-400" />;
    case 'INFO':
    default:
      return <Info size={18} className="text-blue-400" />;
  }
};

const getTrendIcon = (variation: number | null) => {
  if (variation === null) return null;
  if (variation > 0) {
    return <TrendingUp size={16} className="text-green-400" />;
  } else if (variation < 0) {
    return <TrendingDown size={16} className="text-red-400" />;
  }
  return null;
};

export const SensorLogsViewer: React.FC<SensorLogsViewerProps> = ({ machines }) => {
  const [logs, setLogs] = useState<SensorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalLogs, setTotalLogs] = useState(0);
  const { isFullscreen, setIsFullscreen } = useAppContext();

  // Filtros
  const [filterMachine, setFilterMachine] = useState<string>('');
  const [filterSensor, setFilterSensor] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sensores por máquina
  const [sensors, setSensors] = useState<{ [key: string]: any[] }>({});

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ESC key handler for fullscreen exit
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  // Cargar sensores de cada máquina
  useEffect(() => {
    const loadSensors = async () => {
      const sensorsByMachine: { [key: string]: any[] } = {};
      for (const machine of machines) {
        try {
          const alarmSensors = await scadaBackendService.getMachineAlarmSensors(machine.id);
          if (alarmSensors?.sensors) {
            sensorsByMachine[machine.code] = alarmSensors.sensors;
          }
        } catch (error) {
          console.error(`Error loading sensors for machine ${machine.code}:`, error);
        }
      }
      setSensors(sensorsByMachine);
    };

    if (machines.length > 0) {
      loadSensors();
    }
  }, [machines]);

  // Cargar logs
  const loadLogs = async () => {
    try {
      setLoading(true);
      const filters: any = {
        limit: pageSize,
        skip: currentPage * pageSize,
      };
      
      if (filterMachine) {
        filters.machine_id = parseInt(filterMachine);
      }
      if (filterSeverity) {
        filters.severity = filterSeverity;
      }
      if (startDate) {
        filters.start_date = new Date(startDate).toISOString();
      }
      if (endDate) {
        filters.end_date = new Date(endDate).toISOString();
      }
      
      const data = await scadaBackendService.getSensorLogs(filters);
      setLogs(data || []);
      setTotalLogs(data?.length || 0);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar logs al cambiar filtros o página
  useEffect(() => {
    loadLogs();
  }, [currentPage, pageSize, filterMachine, filterSensor, filterSeverity, startDate, endDate]);

  // Auto-refresh cada 10 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadLogs();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, currentPage, pageSize, filterMachine, filterSensor, filterSeverity, startDate, endDate]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0) {
      setCurrentPage(newPage);
    }
  };

  const selectedMachine = filterMachine
    ? machines.find((m) => m.id.toString() === filterMachine)
    : null;

  const machineSensors = selectedMachine ? sensors[selectedMachine.code] || [] : [];

  return (
    <div className={`flex flex-col h-full gap-6 ${isFullscreen ? 'p-0' : 'bg-scada-900 p-4 rounded-lg border border-scada-700'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isFullscreen ? 'bg-scada-800 border-b border-scada-700 px-4 pt-4 pb-2' : ''}`}>
        <div className="flex items-center gap-3">
          <Clock size={24} className="text-blue-400" />
          <div>
            <h3 className="text-lg font-bold text-white">Historial de Logs de Sensores</h3>
            <p className="text-xs text-scada-400">
              {logs.length} registros {filterMachine ? 'de ' + selectedMachine?.name : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-scada-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-actualizar (10s)
          </label>
          <button
            onClick={() => loadLogs()}
            disabled={loading}
            className="px-3 py-2 bg-scada-700 border border-scada-600 rounded-lg hover:bg-scada-600 transition disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-2 bg-scada-700 border border-scada-600 rounded-lg hover:bg-scada-600 transition"
            title={isFullscreen ? 'Salir Fullscreen (ESC)' : 'Maximizar Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={isFullscreen ? 'flex-1 overflow-auto px-4 pb-4' : ''}>
        <SensorLogsContent
            logs={logs}
            loading={loading}
            currentPage={currentPage}
            pageSize={pageSize}
            filterMachine={filterMachine}
            filterSensor={filterSensor}
            filterSeverity={filterSeverity}
            startDate={startDate}
            endDate={endDate}
            machines={machines}
            sensors={sensors}
            autoRefresh={autoRefresh}
            onLoadLogs={loadLogs}
            onFilterMachineChange={(val) => {
              setFilterMachine(val);
              setFilterSensor('');
              setCurrentPage(0);
            }}
            onFilterSensorChange={(val) => {
              setFilterSensor(val);
              setCurrentPage(0);
            }}
            onFilterSeverityChange={(val) => {
              setFilterSeverity(val);
              setCurrentPage(0);
            }}
            onStartDateChange={(val) => {
              setStartDate(val);
              setCurrentPage(0);
            }}
            onEndDateChange={(val) => {
              setEndDate(val);
              setCurrentPage(0);
            }}
            onPageChange={handlePageChange}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(0);
            }}
            onAutoRefreshChange={setAutoRefresh}
          />
      </div>
    </div>
  );
};

// Extracted content component for reuse in both normal and fullscreen views
interface SensorLogsContentProps {
  logs: SensorLog[];
  loading: boolean;
  currentPage: number;
  pageSize: number;
  filterMachine: string;
  filterSensor: string;
  filterSeverity: string;
  startDate: string;
  endDate: string;
  machines: any[];
  sensors: { [key: string]: any[] };
  autoRefresh: boolean;
  onLoadLogs: () => void;
  onFilterMachineChange: (value: string) => void;
  onFilterSensorChange: (value: string) => void;
  onFilterSeverityChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onAutoRefreshChange: (value: boolean) => void;
}

const SensorLogsContent: React.FC<SensorLogsContentProps> = ({
  logs,
  loading,
  currentPage,
  pageSize,
  filterMachine,
  filterSensor,
  filterSeverity,
  startDate,
  endDate,
  machines,
  sensors,
  autoRefresh,
  onLoadLogs,
  onFilterMachineChange,
  onFilterSensorChange,
  onFilterSeverityChange,
  onStartDateChange,
  onEndDateChange,
  onPageChange,
  onPageSizeChange,
  onAutoRefreshChange,
}) => {
  const selectedMachine = filterMachine
    ? machines.find((m) => m.id.toString() === filterMachine)
    : null;

  const machineSensors = selectedMachine ? sensors[selectedMachine.code] || [] : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-scada-850 p-4 rounded-lg border border-scada-700">
        {/* Máquina */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-scada-300 uppercase">Máquina</label>
          <select
            value={filterMachine}
            onChange={(e) => onFilterMachineChange(e.target.value)}
            className="px-2 py-2 bg-scada-800 border border-scada-700 rounded text-sm text-slate-200"
          >
            <option value="">Todas</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sensor */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-scada-300 uppercase">Sensor</label>
          <select
            value={filterSensor}
            onChange={(e) => onFilterSensorChange(e.target.value)}
            disabled={!selectedMachine}
            className="px-2 py-2 bg-scada-800 border border-scada-700 rounded text-sm text-slate-200 disabled:opacity-50"
          >
            <option value="">Todos</option>
            {machineSensors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Severidad */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-scada-300 uppercase">Severidad</label>
          <select
            value={filterSeverity}
            onChange={(e) => onFilterSeverityChange(e.target.value)}
            className="px-2 py-2 bg-scada-800 border border-scada-700 rounded text-sm text-slate-200"
          >
            <option value="">Todas</option>
            <option value="INFO">INFO</option>
            <option value="NORMAL">NORMAL</option>
            <option value="ALERTA">ALERTA</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        {/* Fecha Inicio */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-scada-300 uppercase flex items-center gap-1">
            <Calendar size={12} />
            Desde
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="px-2 py-2 bg-scada-800 border border-scada-700 rounded text-sm text-slate-200"
          />
        </div>

        {/* Fecha Fin */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-scada-300 uppercase flex items-center gap-1">
            <Calendar size={12} />
            Hasta
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="px-2 py-2 bg-scada-800 border border-scada-700 rounded text-sm text-slate-200"
          />
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin">
              <RefreshCw size={32} className="text-blue-400" />
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-scada-400">
            <Info size={32} className="mx-auto mb-2 opacity-50" />
            <p>No hay registros que coincidan con los filtros</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${getSeverityColor(log.severity)} animate-fadeIn`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    {getSeverityIcon(log.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{log.sensor_name}</span>
                        <span className="text-xs opacity-75">({log.sensor_code})</span>
                        {log.machine_name && (
                          <>
                            <span className="text-xs opacity-50">•</span>
                            <span className="text-xs opacity-75">{log.machine_name}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        {log.previous_value !== null
                          ? `${log.previous_value} → ${log.current_value}${log.unit || ''}`
                          : `Valor inicial: ${log.current_value}${log.unit || ''}`}
                      </div>
                      {log.variation_percent !== null && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          {getTrendIcon(log.variation_percent)}
                          <span>
                            Variación: {Math.abs(log.variation_percent).toFixed(2)}%
                          </span>
                        </div>
                      )}
                      <div className="text-xs opacity-50 mt-1">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-mono opacity-75 text-right">
                    {log.severity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-scada-850 p-3 rounded-lg border border-scada-700">
        <div className="flex items-center gap-2">
          <label className="text-xs text-scada-300">Registros por página:</label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
            className="px-2 py-1 bg-scada-800 border border-scada-700 rounded text-xs text-slate-200"
          >
            <option value={20}>20</option>
            <option value={40}>40</option>
            <option value={100}>100</option>
          </select>
        </div>

        <span className="text-xs text-scada-400">
          Página {currentPage + 1} • {logs.length} registros
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="p-2 bg-scada-800 border border-scada-700 rounded hover:bg-scada-700 transition disabled:opacity-50"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={logs.length < pageSize}
            className="p-2 bg-scada-800 border border-scada-700 rounded hover:bg-scada-700 transition disabled:opacity-50"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
