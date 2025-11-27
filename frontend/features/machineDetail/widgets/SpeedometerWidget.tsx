import React from 'react';

interface Props {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  type: 'temperature' | 'humidity' | 'velocity' | 'pressure' | 'generic';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const SpeedometerWidget: React.FC<Props> = ({
  label,
  value,
  unit,
  min = 0,
  max = 100,
  type,
  size = 'md',
  onClick,
}) => {
  const sizes = {
    sm: { width: 100, height: 80, fontSize: 10 },
    md: { width: 140, height: 110, fontSize: 12 },
    lg: { width: 180, height: 140, fontSize: 14 },
  };

  const s = sizes[size];

  // Color schemes based on sensor type
  const colorSchemes = {
    temperature: {
      gradient: ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444'],
      needle: '#dc2626',
      glow: '#ef4444',
      bg: 'from-red-900/20 to-orange-900/20',
      accent: '#f97316',
    },
    humidity: {
      gradient: ['#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'],
      needle: '#0ea5e9',
      glow: '#0ea5e9',
      bg: 'from-blue-900/20 to-cyan-900/20',
      accent: '#0ea5e9',
    },
    velocity: {
      gradient: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'],
      needle: '#a855f7',
      glow: '#a855f7',
      bg: 'from-purple-900/20 to-violet-900/20',
      accent: '#a855f7',
    },
    pressure: {
      gradient: ['#06b6d4', '#22c55e', '#eab308', '#f97316', '#ef4444'],
      needle: '#14b8a6',
      glow: '#14b8a6',
      bg: 'from-teal-900/20 to-emerald-900/20',
      accent: '#14b8a6',
    },
    generic: {
      gradient: ['#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'],
      needle: '#6366f1',
      glow: '#6366f1',
      bg: 'from-slate-900/20 to-gray-900/20',
      accent: '#6366f1',
    },
  };

  const colors = colorSchemes[type];
  const clampedValue = Math.max(min, Math.min(max, value));
  const percentage = (clampedValue - min) / (max - min);
  
  // Angle ranges from -135 to 135 degrees (270 degree sweep)
  const startAngle = -135;
  const endAngle = 135;
  const angleRange = endAngle - startAngle;
  const needleAngle = startAngle + percentage * angleRange;

  // SVG coordinates (center at 70, 60 for the semicircle)
  const cx = 70;
  const cy = 55;
  const radius = 45;

  // Create arc path for gauge background
  const createArc = (r: number, startA: number, endA: number) => {
    const start = {
      x: cx + r * Math.cos((startA * Math.PI) / 180),
      y: cy + r * Math.sin((startA * Math.PI) / 180),
    };
    const end = {
      x: cx + r * Math.cos((endA * Math.PI) / 180),
      y: cy + r * Math.sin((endA * Math.PI) / 180),
    };
    const largeArc = endA - startA > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Create tick marks
  const ticks = [];
  const majorTickCount = 5;
  const minorTickCount = 4;
  
  for (let i = 0; i <= majorTickCount; i++) {
    const angle = startAngle + (i / majorTickCount) * angleRange;
    const rad = (angle * Math.PI) / 180;
    const innerR = radius - 8;
    const outerR = radius - 2;
    const labelR = radius - 15;
    
    const x1 = cx + innerR * Math.cos(rad);
    const y1 = cy + innerR * Math.sin(rad);
    const x2 = cx + outerR * Math.cos(rad);
    const y2 = cy + outerR * Math.sin(rad);
    const labelX = cx + labelR * Math.cos(rad);
    const labelY = cy + labelR * Math.sin(rad);
    
    const tickValue = min + (i / majorTickCount) * (max - min);
    
    ticks.push(
      <g key={`major-${i}`}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="2" />
        <text 
          x={labelX} 
          y={labelY} 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize="7" 
          fill="#cbd5e1"
        >
          {Math.round(tickValue)}
        </text>
      </g>
    );

    // Minor ticks
    if (i < majorTickCount) {
      for (let j = 1; j <= minorTickCount; j++) {
        const minorAngle = angle + (j / (minorTickCount + 1)) * (angleRange / majorTickCount);
        const minorRad = (minorAngle * Math.PI) / 180;
        const minorInnerR = radius - 5;
        const minorOuterR = radius - 2;
        
        ticks.push(
          <line
            key={`minor-${i}-${j}`}
            x1={cx + minorInnerR * Math.cos(minorRad)}
            y1={cy + minorInnerR * Math.sin(minorRad)}
            x2={cx + minorOuterR * Math.cos(minorRad)}
            y2={cy + minorOuterR * Math.sin(minorRad)}
            stroke="#64748b"
            strokeWidth="1"
          />
        );
      }
    }
  }

  // Needle coordinates
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLength = radius - 12;
  const needleX = cx + needleLength * Math.cos(needleRad);
  const needleY = cy + needleLength * Math.sin(needleRad);

  // Determine warning/danger zones
  const isWarning = percentage > 0.7 && percentage <= 0.9;
  const isDanger = percentage > 0.9;

  return (
    <div
      className={`relative flex flex-col items-center cursor-pointer group bg-gradient-to-br ${colors.bg} rounded-lg p-2 border border-slate-700/50 hover:border-slate-600 transition-all`}
      onClick={onClick}
    >
      <svg width={s.width} height={s.height} viewBox="0 0 140 95" className="drop-shadow-lg">
        <defs>
          {/* Gradient for the gauge arc */}
          <linearGradient id={`gaugeGrad-${type}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {colors.gradient.map((color, i) => (
              <stop
                key={i}
                offset={`${(i / (colors.gradient.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </linearGradient>

          {/* Glow filter */}
          <filter id={`glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Shadow for needle */}
          <filter id="needleShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="1" stdDeviation="1" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={radius + 3} fill="none" stroke="#334155" strokeWidth="4" />

        {/* Gauge background arc */}
        <path
          d={createArc(radius, startAngle, endAngle)}
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Colored gauge arc */}
        <path
          d={createArc(radius, startAngle, endAngle)}
          fill="none"
          stroke={`url(#gaugeGrad-${type})`}
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Active value arc */}
        <path
          d={createArc(radius, startAngle, startAngle + percentage * angleRange)}
          fill="none"
          stroke={colors.accent}
          strokeWidth="10"
          strokeLinecap="round"
          filter={`url(#glow-${type})`}
          opacity="0.8"
        />

        {/* Tick marks */}
        {ticks}

        {/* Center hub */}
        <circle cx={cx} cy={cy} r="8" fill="#475569" stroke="#334155" strokeWidth="2" />
        <circle cx={cx} cy={cy} r="5" fill={colors.needle} />

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={colors.needle}
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#needleShadow)"
          className="transition-all duration-500 ease-out"
        />

        {/* Needle cap */}
        <circle cx={cx} cy={cy} r="3" fill="#f8fafc" />

        {/* Digital display */}
        <rect x={cx - 25} y={cy + 12} width="50" height="18" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        <text
          x={cx}
          y={cy + 24}
          textAnchor="middle"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="bold"
          fill={isDanger ? '#ef4444' : isWarning ? '#eab308' : colors.accent}
          className={isDanger ? 'animate-pulse' : ''}
        >
          {typeof value === 'number' ? value.toFixed(1) : value}
        </text>

        {/* Unit label */}
        <text x={cx} y={cy + 40} textAnchor="middle" fontSize="9" fill="#94a3b8">
          {unit}
        </text>

        {/* Type icon */}
        {type === 'temperature' && (
          <g transform="translate(115, 10)">
            <circle cx="8" cy="15" r="4" fill="none" stroke="#f97316" strokeWidth="1.5" />
            <rect x="6" y="2" width="4" height="13" rx="2" fill="none" stroke="#f97316" strokeWidth="1.5" />
          </g>
        )}
        {type === 'humidity' && (
          <g transform="translate(115, 10)">
            <path d="M10 3 L15 12 Q17 18 10 18 Q3 18 5 12 Z" fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
          </g>
        )}
        {type === 'velocity' && (
          <g transform="translate(115, 8)">
            <path d="M5 15 L10 5 L12 12 L18 2" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}
      </svg>

      {/* Label */}
      <div className="text-center mt-1">
        <span
          className="text-xs font-medium truncate block max-w-[120px]"
          style={{ fontSize: s.fontSize, color: colors.accent }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};
