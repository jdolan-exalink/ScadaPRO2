import React from 'react';

interface Props {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  type: 'temperature' | 'humidity' | 'velocity' | 'pressure' | 'generic';
  onClick?: () => void;
}

export const ModernGaugeWidget: React.FC<Props> = ({
  label,
  value,
  unit,
  min = 0,
  max = 100,
  type,
  onClick,
}) => {
  const clampedValue = Math.max(min, Math.min(max, value));
  const percentage = ((clampedValue - min) / (max - min)) * 100;

  // Color schemes based on sensor type
  const colorSchemes = {
    temperature: {
      primary: '#f97316',
      gradient: 'from-orange-500 to-red-500',
      bg: 'bg-orange-500/10',
      ring: 'ring-orange-500/20',
      icon: '🌡️',
    },
    humidity: {
      primary: '#06b6d4',
      gradient: 'from-cyan-500 to-blue-500',
      bg: 'bg-cyan-500/10',
      ring: 'ring-cyan-500/20',
      icon: '💧',
    },
    velocity: {
      primary: '#8b5cf6',
      gradient: 'from-violet-500 to-purple-500',
      bg: 'bg-violet-500/10',
      ring: 'ring-violet-500/20',
      icon: '🌀',
    },
    pressure: {
      primary: '#10b981',
      gradient: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-500/10',
      ring: 'ring-emerald-500/20',
      icon: '🔵',
    },
    generic: {
      primary: '#6366f1',
      gradient: 'from-indigo-500 to-blue-500',
      bg: 'bg-indigo-500/10',
      ring: 'ring-indigo-500/20',
      icon: '📊',
    },
  };

  const colors = colorSchemes[type];
  
  // Determine status based on percentage
  const getStatus = () => {
    if (percentage > 90) return { color: 'text-red-400', label: 'CRÍTICO' };
    if (percentage > 75) return { color: 'text-amber-400', label: 'ALTO' };
    if (percentage > 25) return { color: 'text-emerald-400', label: 'NORMAL' };
    return { color: 'text-blue-400', label: 'BAJO' };
  };
  
  const status = getStatus();

  // Arc path calculation
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Semi-circle
  const offset = circumference - (percentage / 100) * circumference;

  // Static shadow classes for different types
  const hoverShadowClass = {
    temperature: 'hover:shadow-orange-500/10',
    humidity: 'hover:shadow-cyan-500/10', 
    velocity: 'hover:shadow-violet-500/10',
    pressure: 'hover:shadow-emerald-500/10',
    generic: 'hover:shadow-indigo-500/10',
  };

  return (
    <div
      className={`
        relative p-4 rounded-2xl cursor-pointer
        bg-gradient-to-br from-slate-800/80 to-slate-900/80
        border border-slate-700/50 backdrop-blur-sm
        hover:border-slate-600 hover:shadow-lg ${hoverShadowClass[type]}
        transition-all duration-300 group
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{colors.icon}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Gauge */}
      <div className="flex justify-center mb-2">
        <div className="relative">
          <svg width={size} height={size / 2 + 10} className="transform -rotate-0">
            {/* Background arc */}
            <path
              d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-700/50"
              strokeLinecap="round"
            />
            {/* Value arc */}
            <path
              d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
              fill="none"
              stroke={colors.primary}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-500 ease-out"
              style={{
                filter: `drop-shadow(0 0 6px ${colors.primary}40)`,
              }}
            />
          </svg>
          
          {/* Center value */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="text-2xl font-bold text-white font-mono tracking-tight">
              {typeof value === 'number' ? value.toFixed(1) : value}
            </span>
            <span className="text-xs text-slate-400 -mt-1">{unit}</span>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <span className="text-xs text-slate-400 truncate block max-w-full">
          {label.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Hover indicator */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
    </div>
  );
};
