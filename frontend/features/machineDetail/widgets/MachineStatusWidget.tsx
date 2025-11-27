import React, { useState, useEffect } from 'react';
import { WidgetConfig } from '../../../types';
import { Activity, Zap, Clock, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  config: WidgetConfig;
  status?: 'running' | 'stopped' | 'maintenance' | 'alarm' | 'idle';
  runtime?: number; // seconds
  lastCycle?: number; // seconds
  cycleCount?: number;
}

export const MachineStatusWidget: React.FC<Props> = ({ 
  config, 
  status: externalStatus,
  runtime: externalRuntime,
  lastCycle: externalLastCycle,
  cycleCount: externalCycleCount
}) => {
  const [status, setStatus] = useState(externalStatus ?? 'running');
  const [runtime, setRuntime] = useState(externalRuntime ?? 0);
  const [lastCycle, setLastCycle] = useState(externalLastCycle ?? 0);
  const [cycleCount, setCycleCount] = useState(externalCycleCount ?? 0);
  
  useEffect(() => {
    if (externalStatus) setStatus(externalStatus);
    if (externalRuntime !== undefined) setRuntime(externalRuntime);
    if (externalLastCycle !== undefined) setLastCycle(externalLastCycle);
    if (externalCycleCount !== undefined) setCycleCount(externalCycleCount);
  }, [externalStatus, externalRuntime, externalLastCycle, externalCycleCount]);
  
  // Simulate runtime counter
  useEffect(() => {
    if (status !== 'running') return;
    
    const interval = setInterval(() => {
      setRuntime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);
  
  // Simulate cycle changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (status === 'running') {
        setCycleCount(prev => prev + 1);
        setLastCycle(Math.floor(Math.random() * 20) + 10);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const statusConfig = {
    running: {
      label: 'EN PRODUCCIÓN',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      icon: <Activity className="w-8 h-8 text-emerald-400" />,
      pulse: true,
    },
    stopped: {
      label: 'DETENIDA',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/30',
      icon: <CheckCircle2 className="w-8 h-8 text-slate-400" />,
      pulse: false,
    },
    maintenance: {
      label: 'MANTENIMIENTO',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      icon: <Wrench className="w-8 h-8 text-blue-400" />,
      pulse: false,
    },
    alarm: {
      label: 'ALARMA ACTIVA',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      icon: <AlertTriangle className="w-8 h-8 text-red-400" />,
      pulse: true,
    },
    idle: {
      label: 'EN ESPERA',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      icon: <Clock className="w-8 h-8 text-amber-400" />,
      pulse: false,
    },
  };

  const cfg = statusConfig[status];

  return (
    <div className="bg-gradient-to-b from-scada-800 to-scada-900 border-2 border-scada-600 rounded-xl p-4 shadow-xl h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-200 font-bold uppercase text-sm tracking-wide">{config.title}</h3>
        <span className="text-xs text-slate-500 font-mono bg-scada-800 px-2 py-0.5 rounded">STATUS</span>
      </div>
      
      {/* Main Status Display */}
      <div className={`${cfg.bgColor} ${cfg.borderColor} border rounded-xl p-4 mb-4`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${cfg.bgColor} ${cfg.pulse ? 'animate-pulse' : ''}`}>
            {cfg.icon}
          </div>
          <div>
            <span className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</span>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${cfg.color.replace('text-', 'bg-')} ${cfg.pulse ? 'animate-pulse' : ''}`} />
              <span className="text-xs text-slate-500">Estado actual</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Statistics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox 
          icon={<Clock size={16} className="text-blue-400" />}
          label="Tiempo Activo"
          value={formatTime(runtime)}
        />
        <StatBox 
          icon={<Zap size={16} className="text-amber-400" />}
          label="Último Ciclo"
          value={`${lastCycle}s`}
        />
        <StatBox 
          icon={<Activity size={16} className="text-emerald-400" />}
          label="Ciclos Totales"
          value={cycleCount.toLocaleString()}
        />
      </div>
    </div>
  );
};

const StatBox: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-scada-950 border border-scada-700 rounded-lg p-3 text-center">
    <div className="flex justify-center mb-1">{icon}</div>
    <div className="text-lg font-mono font-bold text-white">{value}</div>
    <div className="text-[10px] text-slate-500 uppercase">{label}</div>
  </div>
);
