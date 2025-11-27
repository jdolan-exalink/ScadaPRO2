/**
 * Board Widget Components - Reusable widget components for boards
 */

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { scadaBackendService } from '../../services/scadaBackendService';
import { HistoryDatapoint } from '../../types';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface WidgetProps {
  id: string;
  title: string;
  sensorCode: string;
  sensorName?: string;
  unit?: string;
  currentValue?: number;
  isEditing?: boolean;
  onDelete?: (id: string) => void;
}

/**
 * Gauge Widget - Display current value with visual indicator
 */
export const GaugeWidget: React.FC<WidgetProps & { min?: number; max?: number; threshold?: number }> = ({
  id,
  title,
  currentValue = 0,
  min = 0,
  max = 100,
  unit,
  threshold,
  isEditing,
  onDelete,
}) => {
  const percentage = ((currentValue - min) / (max - min)) * 100;
  const isAlert = threshold && currentValue > threshold;

  const getColor = () => {
    if (isAlert) return '#ef4444';
    if (percentage < 33) return '#10b981';
    if (percentage < 66) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className={`bg-scada-800 rounded-lg shadow p-4 relative group border border-scada-700 ${isEditing ? 'ring-2 ring-scada-500' : ''}`}>
      {isEditing && onDelete && (
        <button
          onClick={() => onDelete(id)}
          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          ✕
        </button>
      )}
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>

      <div className="flex flex-col items-center justify-center">
        <div className="relative w-24 h-24 mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="#475569" strokeWidth="8" />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={getColor()}
              strokeWidth="8"
              strokeDasharray={`${(percentage / 100) * 283} 283`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.3s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{currentValue}</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-scada-400 text-xs">{unit}</p>
          <p className="text-scada-500 text-xs mt-1">
            Rango: {min} - {max}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * KPI Widget - Show single metric with trend
 */
export const KPIWidget: React.FC<WidgetProps & { trend?: 'up' | 'down' | 'stable' }> = ({
  id,
  title,
  currentValue = 0,
  unit,
  trend = 'stable',
  isEditing,
  onDelete,
}) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-scada-accent';
    if (trend === 'down') return 'text-red-500';
    return 'text-scada-400';
  };

  return (
    <div className={`bg-scada-800 rounded-lg shadow p-4 relative group border border-scada-700 ${isEditing ? 'ring-2 ring-scada-500' : ''}`}>
      {isEditing && onDelete && (
        <button
          onClick={() => onDelete(id)}
          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          ✕
        </button>
      )}
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-white">{currentValue}</p>
          <p className="text-sm text-scada-400 mt-1">{unit}</p>
        </div>
        <div className={`${getTrendColor()}`}>
          {trend === 'up' && <TrendingUp size={28} />}
          {trend === 'down' && <TrendingDown size={28} />}
          {trend === 'stable' && <div className="w-7 h-7 border-b-2 border-current" />}
        </div>
      </div>
    </div>
  );
};

/**
 * Status Widget - Show ON/OFF or status indicator
 */
export const StatusWidget: React.FC<WidgetProps> = ({
  id,
  title,
  currentValue = 0,
  unit,
  isEditing,
  onDelete,
}) => {
  const isActive = currentValue > 0;

  return (
    <div
      className={`rounded-lg shadow p-4 relative group border border-scada-700 ${isActive ? 'bg-scada-800' : 'bg-scada-900'} ${
        isEditing ? 'ring-2 ring-scada-500' : ''
      }`}
    >
      {isEditing && onDelete && (
        <button
          onClick={() => onDelete(id)}
          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          ✕
        </button>
      )}
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>

      <div className="flex items-center gap-4">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold ${
            isActive ? 'bg-scada-accent' : 'bg-scada-600'
          }`}
        >
          {isActive ? 'ON' : 'OFF'}
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{isActive ? 'ACTIVO' : 'INACTIVO'}</p>
          <p className="text-sm text-scada-400">{unit}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Line Chart Widget - Display historical data
 */
export const LineChartWidget: React.FC<WidgetProps & { height?: number }> = ({
  id,
  title,
  sensorCode,
  unit,
  height = 200,
  isEditing,
  onDelete,
}) => {
  const [data, setData] = useState<HistoryDatapoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const to = new Date();
        const from = new Date(to.getTime() - 60 * 60 * 1000); // Last hour
        
        // Find sensor ID by code - this is a workaround since getSensorHistoryByCode doesn't exist
        // In production, we'd add a GET /api/sensors/code/{code} endpoint
        const sensors = await scadaBackendService.getSensors();
        const sensor = sensors.find(s => s.code === sensorCode);
        
        if (sensor) {
          const history = await scadaBackendService.getSensorHistory(sensor.id, from, to);
          setData(
            history.map((dp) => ({
              ...dp,
              timestamp: new Date(dp.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
              value: parseFloat(dp.value?.toString() || '0'),
            }))
          );
        }
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
    const interval = setInterval(loadHistory, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [sensorCode]);

  if (loading) {
    return (
      <div className={`bg-scada-800 rounded-lg shadow p-4 relative group border border-scada-700 ${isEditing ? 'ring-2 ring-scada-500' : ''}`}>
        <p className="text-scada-400 text-sm">Cargando...</p>
      </div>
    );
  }

  return (
    <div className={`bg-scada-800 rounded-lg shadow p-4 relative group border border-scada-700 ${isEditing ? 'ring-2 ring-scada-500' : ''}`}>
      {isEditing && onDelete && (
        <button
          onClick={() => onDelete(id)}
          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          ✕
        </button>
      )}
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="timestamp" tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <Tooltip
              formatter={(value) => `${value} ${unit}`}
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#e2e8f0'
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-scada-400 text-sm text-center py-8">Sin datos disponibles</p>
      )}
    </div>
  );
};

/**
 * Alert Widget - Show active alarms
 */
export const AlertWidget: React.FC<WidgetProps & { alerts?: Array<{ severity: string; message: string }> }> = ({
  id,
  title,
  alerts = [],
  isEditing,
  onDelete,
}) => {
  const hasAlerts = alerts.length > 0;

  return (
    <div
      className={`rounded-lg shadow p-4 relative group border border-scada-700 ${hasAlerts ? 'bg-scada-800 border-l-4 border-red-500' : 'bg-scada-900 border-l-4 border-scada-accent'} ${
        isEditing ? 'ring-2 ring-scada-500' : ''
      }`}
    >
      {isEditing && onDelete && (
        <button
          onClick={() => onDelete(id)}
          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          ✕
        </button>
      )}
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <AlertCircle size={18} className={hasAlerts ? 'text-red-500' : 'text-scada-accent'} />
        {title}
      </h3>

      <div className="space-y-2">
        {hasAlerts ? (
          alerts.map((alert, idx) => (
            <div key={idx} className="text-sm p-2 bg-scada-900 rounded border border-scada-700">
              <p className="font-semibold text-red-400">{alert.severity}</p>
              <p className="text-scada-300">{alert.message}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-scada-accent font-semibold">Sin alertas activas</p>
        )}
      </div>
    </div>
  );
};
