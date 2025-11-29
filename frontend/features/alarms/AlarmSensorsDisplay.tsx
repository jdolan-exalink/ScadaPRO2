import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Gauge, Droplets, RotateCw, Zap, AlertCircle } from 'lucide-react';

interface AlarmSensor {
  id: number;
  code: string;
  name: string;
  type: string;
  unit: string | null;
  address: number;
  min_value: number | null;
  max_value: number | null;
  plc_id: number;
  plc_code: string;
  plc_name: string;
}

interface AlarmSensorsDisplayProps {
  machineId: number;
  machineCode: string;
  machineName: string;
  sensors: AlarmSensor[];
  isLoading?: boolean;
}

const getSensorIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'temperature':
      return <Droplets size={16} className="text-orange-400" />;
    case 'rpm':
    case 'speed':
      return <RotateCw size={16} className="text-blue-400" />;
    case 'pressure':
      return <Gauge size={16} className="text-purple-400" />;
    case 'state':
    case 'digital':
      return <Zap size={16} className="text-yellow-400" />;
    default:
      return <AlertCircle size={16} className="text-scada-400" />;
  }
};

const getSensorTypeLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    temperature: 'Temperatura',
    rpm: 'RPM',
    speed: 'Velocidad',
    pressure: 'Presión',
    state: 'Estado',
    digital: 'Digital',
    analog: 'Análogo',
  };
  return labels[type?.toLowerCase()] || type;
};

export const AlarmSensorsDisplay: React.FC<AlarmSensorsDisplayProps> = ({
  machineId,
  machineCode,
  machineName,
  sensors,
  isLoading = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-scada-850 border border-scada-700 rounded-lg p-4">
        <p className="text-scada-400 text-sm">Cargando sensores...</p>
      </div>
    );
  }

  if (!sensors || sensors.length === 0) {
    return (
      <div className="bg-scada-850 border border-scada-700 rounded-lg p-4">
        <p className="text-scada-400 text-sm">No hay sensores disponibles en este equipo</p>
      </div>
    );
  }

  // Group sensors by PLC
  const sensorsByPLC = sensors.reduce(
    (acc, sensor) => {
      if (!acc[sensor.plc_id]) {
        acc[sensor.plc_id] = {
          plc_code: sensor.plc_code,
          plc_name: sensor.plc_name,
          sensors: [],
        };
      }
      acc[sensor.plc_id].sensors.push(sensor);
      return acc;
    },
    {} as {
      [key: number]: {
        plc_code: string;
        plc_name: string;
        sensors: AlarmSensor[];
      };
    }
  );

  const plcIds = Object.keys(sensorsByPLC).map(Number);

  return (
    <div className="bg-scada-850 border border-scada-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-scada-800 transition bg-scada-825"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {expanded ? (
              <ChevronUp size={18} className="text-scada-400" />
            ) : (
              <ChevronDown size={18} className="text-scada-400" />
            )}
          </div>
          <div className="text-left min-w-0">
            <h4 className="text-sm font-semibold text-slate-200 truncate">
              {machineName}
            </h4>
            <p className="text-xs text-scada-400">
              {sensors.length} sensor{sensors.length !== 1 ? 'es' : ''} disponible
              {sensors.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-scada-700 p-4 space-y-4">
          {plcIds.map((plcId) => {
            const plcData = sensorsByPLC[plcId];
            return (
              <div key={plcId} className="space-y-3">
                {/* PLC Header */}
                <div className="px-3 py-2 bg-scada-800 rounded border border-scada-700">
                  <p className="text-xs font-semibold text-scada-300">
                    PLC: {plcData.plc_name} ({plcData.plc_code})
                  </p>
                </div>

                {/* Sensors Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {plcData.sensors.map((sensor) => (
                    <div
                      key={sensor.id}
                      className="bg-scada-900 border border-scada-700 rounded p-3 hover:border-scada-600 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className="flex-shrink-0 mt-1">
                            {getSensorIcon(sensor.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-semibold text-slate-200 truncate">
                                {sensor.name}
                              </p>
                              <span className="text-xs px-2 py-0.5 bg-scada-800 rounded text-scada-300">
                                {sensor.code}
                              </span>
                            </div>
                            <p className="text-xs text-scada-400 mt-1">
                              Tipo: {getSensorTypeLabel(sensor.type)}
                              {sensor.unit && ` (${sensor.unit})`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Sensor Details */}
                      <div className="mt-2 space-y-1 text-xs text-scada-400">
                        <p>
                          <span className="text-scada-500">Dirección:</span> {sensor.address}
                        </p>
                        {sensor.min_value !== null && sensor.max_value !== null && (
                          <p>
                            <span className="text-scada-500">Rango:</span> {sensor.min_value} -{' '}
                            {sensor.max_value}
                            {sensor.unit && ` ${sensor.unit}`}
                          </p>
                        )}
                        {sensor.min_value !== null && sensor.max_value === null && (
                          <p>
                            <span className="text-scada-500">Mín:</span> {sensor.min_value}
                            {sensor.unit && ` ${sensor.unit}`}
                          </p>
                        )}
                        {sensor.max_value !== null && sensor.min_value === null && (
                          <p>
                            <span className="text-scada-500">Máx:</span> {sensor.max_value}
                            {sensor.unit && ` ${sensor.unit}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
