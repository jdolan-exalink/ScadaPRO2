import React from 'react';

interface Props {
  label: string;
  value: boolean;
  onClick?: () => void;
}

export const ModernSwitchWidget: React.FC<Props> = ({ 
  label, 
  value, 
  onClick 
}) => {
  return (
    <div 
      className={`
        relative p-3 rounded-xl cursor-pointer
        bg-gradient-to-br from-slate-800/80 to-slate-900/80
        border backdrop-blur-sm
        transition-all duration-300 group
        ${value 
          ? 'border-emerald-500/50 shadow-md shadow-emerald-500/20' 
          : 'border-slate-700/50 hover:border-slate-600'
        }
      `}
      onClick={onClick}
    >
      {/* Main content */}
      <div className="flex items-center gap-3">
        {/* Power icon */}
        <div 
          className={`
            relative w-10 h-10 rounded-lg flex items-center justify-center
            transition-all duration-300
            ${value 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-slate-700/50 text-slate-500'
            }
          `}
        >
          {/* Glow effect */}
          {value && (
            <div className="absolute inset-0 rounded-lg bg-emerald-500/20 animate-pulse" />
          )}
          
          {/* Power icon */}
          <svg 
            className="w-5 h-5 relative z-10" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" 
            />
          </svg>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-slate-400 truncate leading-tight">
            {label.replace(/_/g, ' ')}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div 
              className={`
                w-1.5 h-1.5 rounded-full
                ${value ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}
              `}
            />
            <span 
              className={`
                text-xs font-semibold uppercase
                ${value ? 'text-emerald-400' : 'text-slate-500'}
              `}
            >
              {value ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
