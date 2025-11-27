import React, { useState, useEffect } from 'react';
import { WidgetConfig } from '../../../types';

interface Props {
  config: WidgetConfig;
  showDigital?: boolean;
}

export const AnalogClockWidget: React.FC<Props> = ({ config, showDigital = true }) => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  
  // Calculate angles
  const secondAngle = seconds * 6; // 360/60
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = (hours % 12) * 30 + minutes * 0.5; // 360/12

  // Generate hour markers
  const hourMarkers = [];
  for (let i = 0; i < 12; i++) {
    const angle = i * 30;
    const radians = ((angle - 90) * Math.PI) / 180;
    const isMain = i % 3 === 0;
    const innerRadius = isMain ? 75 : 80;
    const outerRadius = 88;
    
    const x1 = 100 + innerRadius * Math.cos(radians);
    const y1 = 100 + innerRadius * Math.sin(radians);
    const x2 = 100 + outerRadius * Math.cos(radians);
    const y2 = 100 + outerRadius * Math.sin(radians);
    
    hourMarkers.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isMain ? '#f8fafc' : '#64748b'}
        strokeWidth={isMain ? 3 : 1.5}
        strokeLinecap="round"
      />
    );
    
    // Hour numbers for main markers
    if (isMain) {
      const labelRadius = 65;
      const labelX = 100 + labelRadius * Math.cos(radians);
      const labelY = 100 + labelRadius * Math.sin(radians);
      const hourNum = i === 0 ? 12 : i / 3 * 3;
      
      hourMarkers.push(
        <text
          key={`num-${i}`}
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#cbd5e1"
          fontSize="14"
          fontWeight="bold"
        >
          {hourNum}
        </text>
      );
    }
  }

  return (
    <div className="bg-gradient-to-b from-scada-800 to-scada-900 border-2 border-scada-600 rounded-xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-slate-200 font-bold uppercase text-sm tracking-wide">{config.title}</h3>
        <span className="text-xs text-emerald-400 font-semibold">● SYNC</span>
      </div>
      
      {/* Clock Face */}
      <div className="flex justify-center">
        <svg viewBox="0 0 200 200" className="w-full max-w-[200px]">
          {/* Outer bezel */}
          <circle cx="100" cy="100" r="96" fill="none" stroke="#475569" strokeWidth="4" />
          <circle cx="100" cy="100" r="93" fill="none" stroke="#334155" strokeWidth="2" />
          
          {/* Face background */}
          <defs>
            <radialGradient id="clock-face" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="90" fill="url(#clock-face)" />
          
          {/* Hour markers */}
          {hourMarkers}
          
          {/* Hour hand */}
          <g transform={`rotate(${hourAngle}, 100, 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="50"
              stroke="#f8fafc"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          
          {/* Minute hand */}
          <g transform={`rotate(${minuteAngle}, 100, 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="30"
              stroke="#cbd5e1"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
          
          {/* Second hand */}
          <g transform={`rotate(${secondAngle}, 100, 100)`}>
            <line
              x1="100"
              y1="110"
              x2="100"
              y2="25"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="100" cy="25" r="3" fill="#ef4444" />
          </g>
          
          {/* Center cap */}
          <circle cx="100" cy="100" r="8" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <circle cx="100" cy="100" r="4" fill="#ef4444" />
        </svg>
      </div>
      
      {/* Digital Display */}
      {showDigital && (
        <div className="mt-2 flex justify-center">
          <div className="bg-scada-950 border border-scada-700 rounded-lg px-4 py-2 shadow-inner">
            <span className="font-mono text-xl text-emerald-400 font-bold">
              {hours.toString().padStart(2, '0')}
              <span className="animate-pulse">:</span>
              {minutes.toString().padStart(2, '0')}
              <span className="animate-pulse">:</span>
              {seconds.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
