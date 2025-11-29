import React, { useEffect, useState } from 'react';
import { Settings, Save, AlertCircle, Check, X } from 'lucide-react';
import { scadaBackendService } from '../../services/scadaBackendService';

interface SensorSeverityConfigProps {
  machines: any[];
}

interface SensorConfig {
  id: number;
  sensor_id: number;
  default_severity: string;
  variation_threshold_normal: number;
  variation_threshold_alert: number;
  variation_threshold_critical: number;
  is_boolean_critical: boolean;
  log_enabled: boolean;
  log_interval_seconds: number;
  sensor_code: string;
  sensor_name: string;
  sensor_type: string;
}

export const SensorSeverityConfig: React.FC<SensorSeverityConfigProps> = ({ machines }) => {
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [sensors, setSensors] = useState<any[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<any>(null);
  const [config, setConfig] = useState<SensorConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Cargar sensores cuando se selecciona una máquina
  useEffect(() => {
    if (selectedMachine) {
      loadMachineSensors();
    }
  }, [selectedMachine]);

  // Cargar configuración cuando se selecciona un sensor
  useEffect(() => {
    if (selectedSensor) {
      loadSensorConfig();
    }
  }, [selectedSensor]);

  const loadMachineSensors = async () => {
    try {
      setLoading(true);
      const alarmSensors = await scadaBackendService.getMachineAlarmSensors(selectedMachine.id);
      if (alarmSensors?.sensors) {
        setSensors(alarmSensors.sensors);
        setSelectedSensor(null);
        setConfig(null);
      }
    } catch (error) {
      console.error('Error loading sensors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSensorConfig = async () => {
    try {
      setLoading(true);
      const configData = await scadaBackendService.getSensorSeverityConfig(selectedSensor.id);
      if (configData) {
        setConfig(configData);
      }
    } catch (error) {
      console.error('Error loading sensor config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field: keyof SensorConfig, value: any) => {
    if (config) {
      setConfig({
        ...config,
        [field]: value,
      });
    }
  };

  const handleSaveConfig = async () => {
    if (!config || !selectedSensor) return;

    try {
      setSaving(true);
      await scadaBackendService.updateSensorSeverityConfig(selectedSensor.id, {
        default_severity: config.default_severity,
        variation_threshold_normal: config.variation_threshold_normal,
        variation_threshold_alert: config.variation_threshold_alert,
        variation_threshold_critical: config.variation_threshold_critical,
        log_enabled: config.log_enabled,
        log_interval_seconds: config.log_interval_seconds,
      });

      setSuccessMessage('Configuración guardada correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-scada-900 p-6 rounded-lg border border-scada-700">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Settings size={24} className="text-purple-400" />
        <div>
          <h3 className="text-lg font-bold text-white">Configuración de Sensores</h3>
          <p className="text-xs text-scada-400">
            Configura severidad y umbrales de variación para cada sensor
          </p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-900 border border-green-700 rounded-lg text-green-300 animate-pulse">
          <Check size={18} />
          {successMessage}
        </div>
      )}

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Machine Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-scada-300">Selecciona una máquina</label>
          <select
            value={selectedMachine?.id || ''}
            onChange={(e) => {
              const machine = machines.find((m) => m.id === parseInt(e.target.value));
              setSelectedMachine(machine);
            }}
            className="px-3 py-2 bg-scada-800 border border-scada-700 rounded-lg text-slate-200"
          >
            <option value="">Selecciona una máquina...</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sensor Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-scada-300">Selecciona un sensor</label>
          <select
            value={selectedSensor?.id || ''}
            onChange={(e) => {
              const sensor = sensors.find((s) => s.id === parseInt(e.target.value));
              setSelectedSensor(sensor);
            }}
            disabled={!selectedMachine || sensors.length === 0}
            className="px-3 py-2 bg-scada-800 border border-scada-700 rounded-lg text-slate-200 disabled:opacity-50"
          >
            <option value="">
              {sensors.length === 0 ? 'No hay sensores' : 'Selecciona un sensor...'}
            </option>
            {sensors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Configuration Panel */}
      {config && selectedSensor && (
        <div className="bg-scada-850 border border-scada-700 rounded-lg p-6 space-y-6">
          {/* Sensor Info */}
          <div className="border-b border-scada-700 pb-4">
            <h4 className="text-sm font-semibold text-white mb-3">Información del Sensor</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-scada-400">Código:</p>
                <p className="font-mono text-slate-200">{config.sensor_code}</p>
              </div>
              <div>
                <p className="text-scada-400">Nombre:</p>
                <p className="text-slate-200">{config.sensor_name}</p>
              </div>
              <div>
                <p className="text-scada-400">Tipo:</p>
                <p className="text-slate-200 capitalize">{config.sensor_type}</p>
              </div>
            </div>
          </div>

          {/* Severity Config */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white">Configuración de Severidad</h4>

            {/* Check if boolean sensor */}
            {config.sensor_type && config.sensor_type.toLowerCase().includes('boolean') ? (
              // Boolean sensor configuration
              <div className="space-y-4 bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-300 mb-3">
                  ⓘ Este es un sensor booleano. No se aplicarán porcentajes de variación.
                </p>

                {/* Boolean Critical Toggle */}
                <div className="flex items-center gap-3 bg-scada-800 p-3 rounded-lg border border-scada-700">
                  <input
                    type="checkbox"
                    id="is_boolean_critical"
                    checked={config.is_boolean_critical}
                    onChange={(e) => handleConfigChange('is_boolean_critical', e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor="is_boolean_critical" className="text-sm font-semibold text-white cursor-pointer">
                      🚨 Marcar como Crítico
                    </label>
                    <p className="text-xs text-scada-400 mt-1">
                      Si está activo, cualquier cambio en este sensor será registrado como CRITICAL
                      (ej: motor apagado, alarma activada, puerta abierta)
                    </p>
                  </div>
                </div>

                {/* Display Info */}
                <div className="bg-scada-800 p-3 rounded-lg border border-scada-700">
                  <p className="text-xs text-scada-300 mb-2"><strong>Comportamiento:</strong></p>
                  {config.is_boolean_critical ? (
                    <p className="text-sm text-red-400">
                      ⚠️ Cualquier cambio → <strong>CRITICAL</strong>
                    </p>
                  ) : (
                    <p className="text-sm text-blue-400">
                      ℹ️ Cualquier cambio → <strong>INFO</strong>
                    </p>
                  )}
                </div>

                {/* Logging */}
                <div className="flex items-center gap-2 pt-2 border-t border-scada-700">
                  <input
                    type="checkbox"
                    id="log_enabled"
                    checked={config.log_enabled}
                    onChange={(e) => handleConfigChange('log_enabled', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="log_enabled" className="text-sm text-scada-300 cursor-pointer">
                    Habilitar registro de cambios
                  </label>
                </div>
              </div>
            ) : (
              // Numeric sensor configuration
              <>
                {/* Default Severity */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-scada-300 uppercase">
                    Severidad por defecto
                  </label>
                  <select
                    value={config.default_severity}
                    onChange={(e) => handleConfigChange('default_severity', e.target.value)}
                    className="px-3 py-2 bg-scada-800 border border-scada-700 rounded text-sm text-slate-200"
                  >
                    <option value="INFO">INFO</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="ALERTA">ALERTA</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                {/* Logging */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="log_enabled"
                    checked={config.log_enabled}
                    onChange={(e) => handleConfigChange('log_enabled', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="log_enabled" className="text-sm text-scada-300 cursor-pointer">
                    Habilitar registro de cambios
                  </label>
                </div>

                {config.log_enabled && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-scada-300 uppercase">
                      Intervalo de log (segundos) - 0 = registrar siempre
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={config.log_interval_seconds}
                      onChange={(e) =>
                        handleConfigChange('log_interval_seconds', parseInt(e.target.value))
                      }
                      className="px-3 py-2 bg-scada-800 border border-scada-700 rounded text-sm text-slate-200"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Variation Thresholds - Only show for non-boolean sensors */}
          {!(config.sensor_type && config.sensor_type.toLowerCase().includes('boolean')) && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white">Umbrales de Variación (%)</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* NORMAL Threshold */}
              <div className="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg p-4 space-y-2">
                <label className="text-sm font-semibold text-yellow-300">NORMAL (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={config.variation_threshold_normal}
                  onChange={(e) =>
                    handleConfigChange(
                      'variation_threshold_normal',
                      parseFloat(e.target.value)
                    )
                  }
                  className="w-full px-2 py-2 bg-scada-800 border border-yellow-700 rounded text-sm text-slate-200"
                />
                <p className="text-xs text-yellow-300 opacity-75">
                  Variación {config.variation_threshold_normal}% ↑ = NORMAL
                </p>
              </div>

              {/* ALERTA Threshold */}
              <div className="bg-orange-900 bg-opacity-30 border border-orange-700 rounded-lg p-4 space-y-2">
                <label className="text-sm font-semibold text-orange-300">ALERTA (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={config.variation_threshold_alert}
                  onChange={(e) =>
                    handleConfigChange('variation_threshold_alert', parseFloat(e.target.value))
                  }
                  className="w-full px-2 py-2 bg-scada-800 border border-orange-700 rounded text-sm text-slate-200"
                />
                <p className="text-xs text-orange-300 opacity-75">
                  Variación {config.variation_threshold_alert}% ↑ = ALERTA
                </p>
              </div>

              {/* CRITICAL Threshold */}
              <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 space-y-2">
                <label className="text-sm font-semibold text-red-300">CRITICAL (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={config.variation_threshold_critical}
                  onChange={(e) =>
                    handleConfigChange(
                      'variation_threshold_critical',
                      parseFloat(e.target.value)
                    )
                  }
                  className="w-full px-2 py-2 bg-scada-800 border border-red-700 rounded text-sm text-slate-200"
                />
                <p className="text-xs text-red-300 opacity-75">
                  Variación {config.variation_threshold_critical}% ↑ = CRITICAL
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-3 flex gap-2">
              <AlertCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-semibold">Nota de configuración:</p>
                <p className="opacity-75">
                  Por defecto se registra un cambio cuando la variación es mayor al 5%. Estos valores
                  configuran a partir de qué variación se cambia la severidad.
                </p>
              </div>
            </div>
          </div>
          )}
          {/* End of variation thresholds conditional */}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end border-t border-scada-700 pt-4">
            <button
              onClick={() => loadSensorConfig()}
              className="px-4 py-2 bg-scada-700 border border-scada-600 rounded-lg hover:bg-scada-600 transition"
            >
              <X size={18} className="inline mr-2" />
              Cancelar
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!config && selectedSensor === null && (
        <div className="flex flex-col items-center justify-center h-64 text-scada-400">
          <Settings size={48} className="opacity-30 mb-3" />
          <p>Selecciona un sensor para configurar</p>
        </div>
      )}
    </div>
  );
};
