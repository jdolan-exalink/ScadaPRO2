import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../App';
import { scadaBackendService } from '../../services/scadaBackendService';
import { Machine, MachineLayout, WidgetConfig, SensorWithMQTT } from '../../types';
import { GaugeWidget } from './widgets/GaugeWidget';
import { LineChartWidget } from './widgets/LineChartWidget';
import { DigitalIOWidget } from './widgets/DigitalIOWidget';
import { StatusWidget } from './widgets/StatusWidget';
import { IndustrialGaugeWidget } from './widgets/IndustrialGaugeWidget';
import { IndustrialSwitchWidget } from './widgets/IndustrialSwitchWidget';
import { LEDIndicatorWidget } from './widgets/LEDIndicatorWidget';
import { DigitalDisplayWidget } from './widgets/DigitalDisplayWidget';
import { BarGraphWidget } from './widgets/BarGraphWidget';
import { AnalogClockWidget } from './widgets/AnalogClockWidget';
import { PushButtonWidget } from './widgets/PushButtonWidget';
import { MachineStatusWidget } from './widgets/MachineStatusWidget';
import { Maximize, Minimize, ChevronDown, Activity, Cpu, Zap, Clock, Settings, Radio, Server } from 'lucide-react';

export const MachineDetail: React.FC = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();
  const { currentBackend } = useAppContext();
  
  const [layout, setLayout] = useState<MachineLayout | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [sensors, setSensors] = useState<SensorWithMQTT[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch list of machines for the dropdown
  useEffect(() => {
    if(!currentBackend) return;
    scadaBackendService.getMachines()
      .then(data => {
        setMachines(data);
        // If no machineId in URL but we have machines, navigate to first one
        if (!machineId && data.length > 0) {
          navigate(`/machines/${data[0].id}`, { replace: true });
        }
      })
      .catch(err => console.error("Error fetching machines list", err));
  }, [currentBackend]);

  // Fetch layout and sensors for current machine
  useEffect(() => {
    if (!currentBackend || !machineId) return;

    setLoading(true);
    
    const machine = machines.find(m => String(m.id) === machineId);
    setSelectedMachine(machine || null);
    
    Promise.all([
      machine ? scadaBackendService.getSensors().catch(() => []) : Promise.resolve([])
    ])
      .then(([sensorData]) => {
        // For now, use sensors directly (layout support can be added later)
        setSensors(sensorData);
        setLayout(null);
        setShowDemoPanel(true);
      })
      .finally(() => setLoading(false));
  }, [currentBackend, machineId, machines]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Listen for fullscreen change events (e.g. user pressing Escape)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleMachineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate(`/machines/${e.target.value}`);
  };

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.type) {
      case 'gauge':
        return <GaugeWidget key={widget.id} config={widget} />;
      case 'line_chart':
        return <LineChartWidget key={widget.id} config={widget} />;
      case 'digital_io':
        return <DigitalIOWidget key={widget.id} config={widget} />;
      case 'status':
        return <StatusWidget key={widget.id} config={widget} />;
      default:
        return (
          <div key={widget.id} className="bg-scada-800 border border-scada-700 rounded-lg p-4 text-slate-500">
             Widget desconocido: {widget.type}
          </div>
        );
    }
  };

  // Generate demo widgets for industrial SCADA panel
  const renderDemoPanel = () => {
    const demoWidgets: WidgetConfig[] = [
      { id: 'status1', type: 'status', title: 'Estado de Máquina', sensorCode: 'STATUS_001', machineId: machineId!, cols: 6 },
      { id: 'clock1', type: 'status', title: 'Hora del Sistema', sensorCode: 'TIME_001', machineId: machineId!, cols: 3 },
      { id: 'display1', type: 'gauge', title: 'Contador de Piezas', sensorCode: 'CNT_001', machineId: machineId!, cols: 3, config: { min: 0, max: 9999, unit: 'pcs', decimals: 0 } },
      { id: 'gauge1', type: 'gauge', title: 'Temperatura Motor', sensorCode: 'TEMP_001', machineId: machineId!, cols: 4, config: { min: 0, max: 120, unit: '°C', warningThreshold: 70, dangerThreshold: 90 } },
      { id: 'gauge2', type: 'gauge', title: 'Presión Sistema', sensorCode: 'PRES_001', machineId: machineId!, cols: 4, config: { min: 0, max: 10, unit: 'bar', warningThreshold: 7, dangerThreshold: 9 } },
      { id: 'gauge3', type: 'gauge', title: 'Velocidad RPM', sensorCode: 'RPM_001', machineId: machineId!, cols: 4, config: { min: 0, max: 3000, unit: 'RPM', warningThreshold: 2400, dangerThreshold: 2700 } },
      { id: 'switch1', type: 'digital_io', title: 'Control de Actuadores', sensorCode: 'DO_001', machineId: machineId!, cols: 4 },
      { id: 'led1', type: 'status', title: 'Estados del Sistema', sensorCode: 'STATUS_002', machineId: machineId!, cols: 4 },
      { id: 'buttons1', type: 'action_button', title: 'Panel de Control', sensorCode: 'CTRL_001', machineId: machineId!, cols: 4 },
      { id: 'bar1', type: 'gauge', title: 'Monitoreo de Variables', sensorCode: 'MULTI_001', machineId: machineId!, cols: 12 },
    ];

    return (
      <div className="grid grid-cols-12 gap-4">
        {/* Row 1: Status Overview */}
        <div className="col-span-12 lg:col-span-6">
          <MachineStatusWidget config={demoWidgets[0]} />
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-3">
          <AnalogClockWidget config={demoWidgets[1]} />
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-3">
          <DigitalDisplayWidget config={demoWidgets[2]} />
        </div>
        
        {/* Row 2: Industrial Gauges */}
        <div className="col-span-12 lg:col-span-4">
          <IndustrialGaugeWidget config={demoWidgets[3]} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <IndustrialGaugeWidget config={demoWidgets[4]} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <IndustrialGaugeWidget config={demoWidgets[5]} />
        </div>
        
        {/* Row 3: Controls and Status */}
        <div className="col-span-12 lg:col-span-4">
          <IndustrialSwitchWidget config={demoWidgets[6]} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <LEDIndicatorWidget config={demoWidgets[7]} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <PushButtonWidget config={demoWidgets[8]} />
        </div>
        
        {/* Row 4: Bar Graph */}
        <div className="col-span-12">
          <BarGraphWidget config={demoWidgets[9]} />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-scada-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400">Cargando configuración de máquina...</span>
        </div>
      </div>
    );
  }
  
  // No machine selected - show machine selector
  if (!machineId || machines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-6">
        <div className="w-20 h-20 rounded-full bg-scada-800 border-2 border-scada-600 flex items-center justify-center">
          <Cpu size={40} className="text-scada-400" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Detalle de Máquina</h2>
          <p className="text-slate-400 mb-6">Selecciona una máquina para ver su panel SCADA</p>
          
          {machines.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
              {machines.map(machine => (
                <button
                  key={machine.id}
                  onClick={() => navigate(`/machines/${machine.id}`)}
                  className="p-6 bg-scada-800 border-2 border-scada-700 rounded-xl hover:border-scada-500 hover:bg-scada-700 transition-all group"
                >
                  <Server size={32} className="mx-auto mb-3 text-scada-400 group-hover:text-scada-300" />
                  <h3 className="text-lg font-semibold text-white">{machine.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{machine.code}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-amber-400">No hay máquinas configuradas en el backend</p>
          )}
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
      {/* Header Bar - Industrial Style */}
      <div className="bg-gradient-to-r from-scada-800 via-scada-800 to-scada-850 border-2 border-scada-600 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: Machine Selector */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-scada-700 border border-scada-600 flex items-center justify-center">
              <Cpu size={24} className="text-emerald-400" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Panel SCADA</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              
              {/* Machine Switcher */}
              <div className="relative mt-1">
                <select 
                  value={machineId}
                  onChange={handleMachineChange}
                  className="appearance-none bg-scada-900 border-2 border-scada-600 text-white py-2 pl-4 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-lg cursor-pointer hover:border-scada-500 transition-colors"
                >
                  {machines.map(m => (
                    <option key={m.id} value={String(m.id)}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
          </div>
          
          {/* Center: Status Indicators */}
          <div className="hidden lg:flex items-center gap-6">
            <StatusIndicator icon={<Activity size={16} />} label="Online" status="online" />
            <StatusIndicator icon={<Radio size={16} />} label="MQTT" status="online" />
            <StatusIndicator icon={<Zap size={16} />} label="PLC" status="online" />
            <StatusIndicator icon={<Clock size={16} />} label="Sync" status="warning" />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {selectedMachine && (
              <div className="hidden md:block text-right">
                <span className="text-xs text-slate-500 block">Código</span>
                <span className="text-sm font-mono text-slate-300">{selectedMachine.code}</span>
              </div>
            )}
            
            <div className="h-8 w-px bg-scada-600 hidden md:block" />
            
            <button 
              onClick={toggleFullscreen}
              className="p-3 bg-scada-700 border-2 border-scada-600 text-slate-300 rounded-lg hover:bg-scada-600 hover:text-white hover:border-scada-500 transition-all"
              title="Pantalla Completa (Modo Panel)"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            
            <button 
              className="p-3 bg-scada-700 border-2 border-scada-600 text-slate-300 rounded-lg hover:bg-scada-600 hover:text-white hover:border-scada-500 transition-all"
              title="Configuración"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Sensors Info Bar */}
      {sensors.length > 0 && (
        <div className="bg-scada-800/50 border border-scada-700 rounded-lg p-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs text-slate-500 uppercase font-semibold">Sensores Detectados:</span>
            <div className="flex gap-2 flex-wrap">
              {sensors.slice(0, 8).map(sensor => (
                <span 
                  key={sensor.id}
                  className="text-xs bg-scada-700 text-slate-300 px-2 py-1 rounded font-mono"
                  title={sensor.mqtt_topic}
                >
                  {sensor.code}
                </span>
              ))}
              {sensors.length > 8 && (
                <span className="text-xs text-slate-500">+{sensors.length - 8} más</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {layout ? (
        <div className="grid grid-cols-12 gap-4">
          {layout.widgets.map((widget) => (
            <div 
              key={widget.id}
              className={`
                col-span-12 md:col-span-6 
                ${widget.cols === 3 ? 'lg:col-span-3' : ''}
                ${widget.cols === 4 ? 'lg:col-span-4' : ''}
                ${widget.cols === 6 ? 'lg:col-span-6' : ''}
                ${widget.cols === 8 ? 'lg:col-span-8' : ''}
                ${widget.cols === 12 ? 'lg:col-span-12' : ''}
              `}
            >
              {renderWidget(widget)}
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Demo Panel Info */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-4">
            <Zap className="text-amber-400 shrink-0" size={24} />
            <div>
              <h4 className="text-amber-300 font-semibold">Panel de Demostración</h4>
              <p className="text-sm text-slate-400">
                Esta máquina no tiene un layout configurado. Se muestra un panel SCADA de ejemplo con widgets industriales.
              </p>
            </div>
          </div>
          
          {/* Render Demo Panel */}
          {renderDemoPanel()}
        </>
      )}
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