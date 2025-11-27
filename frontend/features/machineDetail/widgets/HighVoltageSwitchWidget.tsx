import React from 'react';

interface Props {
  label: string;
  value: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const HighVoltageSwitchWidget: React.FC<Props> = ({ 
  label, 
  value, 
  size = 'md',
  onClick 
}) => {
  const sizes = {
    sm: { width: 60, height: 100, fontSize: 8 },
    md: { width: 80, height: 130, fontSize: 10 },
    lg: { width: 100, height: 160, fontSize: 12 },
  };
  
  const s = sizes[size];
  
  return (
    <div 
      className="flex flex-col items-center cursor-pointer group"
      onClick={onClick}
    >
      <svg 
        width={s.width} 
        height={s.height} 
        viewBox="0 0 80 130" 
        className="drop-shadow-lg"
      >
        <defs>
          {/* Gradient for metal base */}
          <linearGradient id="metalBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          
          {/* Gradient for handle */}
          <linearGradient id="handleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="30%" stopColor="#334155" />
            <stop offset="70%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          
          {/* Glow effect for ON state */}
          <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Base plate */}
        <rect x="10" y="90" width="60" height="35" rx="4" fill="url(#metalBase)" stroke="#1e293b" strokeWidth="2" />
        
        {/* Mounting holes */}
        <circle cx="20" cy="100" r="3" fill="#0f172a" />
        <circle cx="60" cy="100" r="3" fill="#0f172a" />
        <circle cx="20" cy="115" r="3" fill="#0f172a" />
        <circle cx="60" cy="115" r="3" fill="#0f172a" />
        
        {/* Contact terminals */}
        <rect x="25" y="85" width="10" height="10" rx="2" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
        <rect x="45" y="85" width="10" height="10" rx="2" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
        
        {/* Pivot point */}
        <circle cx="40" cy="90" r="8" fill="#475569" stroke="#1e293b" strokeWidth="2" />
        <circle cx="40" cy="90" r="4" fill="#64748b" />
        
        {/* Knife blade / Switch arm */}
        <g 
          transform={`rotate(${value ? -45 : 45}, 40, 90)`}
          className="transition-transform duration-300"
        >
          {/* Blade */}
          <rect 
            x="35" 
            y="20" 
            width="10" 
            height="70" 
            rx="2" 
            fill={value ? '#22c55e' : '#64748b'}
            stroke={value ? '#16a34a' : '#475569'}
            strokeWidth="2"
            filter={value ? 'url(#glowGreen)' : 'none'}
          />
          
          {/* Handle grip */}
          <rect x="30" y="5" width="20" height="25" rx="3" fill="url(#handleGradient)" stroke="#0f172a" strokeWidth="1" />
          
          {/* Handle grip lines */}
          <line x1="33" y1="10" x2="33" y2="25" stroke="#0f172a" strokeWidth="1" />
          <line x1="37" y1="10" x2="37" y2="25" stroke="#0f172a" strokeWidth="1" />
          <line x1="43" y1="10" x2="43" y2="25" stroke="#0f172a" strokeWidth="1" />
          <line x1="47" y1="10" x2="47" y2="25" stroke="#0f172a" strokeWidth="1" />
        </g>
        
        {/* Status indicator light */}
        <circle 
          cx="40" 
          cy="107" 
          r="6" 
          fill={value ? '#22c55e' : '#ef4444'}
          filter={value ? 'url(#glowGreen)' : 'url(#glowRed)'}
          className={value ? '' : 'animate-pulse'}
        />
        <circle cx="40" cy="107" r="3" fill={value ? '#4ade80' : '#f87171'} />
        
        {/* ON/OFF labels */}
        <text x="15" y="50" fontSize="8" fill={value ? '#22c55e' : '#475569'} fontWeight="bold">ON</text>
        <text x="58" y="50" fontSize="8" fill={!value ? '#ef4444' : '#475569'} fontWeight="bold">OFF</text>
      </svg>
      
      {/* Label */}
      <div className="mt-1 text-center">
        <span 
          className={`text-xs font-medium truncate max-w-[80px] block ${
            value ? 'text-emerald-400' : 'text-red-400'
          }`}
          style={{ fontSize: s.fontSize }}
        >
          {label}
        </span>
        <span className={`text-[10px] font-bold ${value ? 'text-emerald-500' : 'text-red-500'}`}>
          {value ? 'CERRADO' : 'ABIERTO'}
        </span>
      </div>
    </div>
  );
};
