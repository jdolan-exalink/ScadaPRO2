import React, { useState, useEffect } from 'react';
import { WidgetConfig } from '../../../types';

interface Props {
  config: WidgetConfig;
  value?: number;
}

export const IndustrialGaugeWidget: React.FC<Props> = ({ config, value: externalValue }) => {
  const [value, setValue] = useState(externalValue ?? 0);
  const min = config.config?.min ?? 0;
  const max = config.config?.max ?? 100;
  const unit = config.config?.unit ?? '';
  const warningThreshold = config.config?.warningThreshold ?? 70;
  const dangerThreshold = config.config?.dangerThreshold ?? 90;
  
  useEffect(() => {
    if (externalValue !== undefined) {
      setValue(externalValue);
      return;
    }
    // Simulate real-time data if no external value
    const interval = setInterval(() => {
      setValue(Math.floor(Math.random() * (max - min) + min));
    }, 2000);
    return () => clearInterval(interval);
  }, [externalValue, min, max]);

  // Calculate angle for the needle (-135 to 135 degrees = 270 degree sweep)
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const angle = -135 + (percentage * 270);
  
  // Generate tick marks
  const ticks = [];
  const numTicks = 10;
  for (let i = 0; i <= numTicks; i++) {
    const tickAngle = -135 + (i / numTicks) * 270;
    const tickValue = min + (i / numTicks) * (max - min);
    const isLarge = i % 2 === 0;
    const radians = (tickAngle * Math.PI) / 180;
    
    // Tick line positions
    const innerRadius = isLarge ? 70 : 75;
    const outerRadius = 85;
    const x1 = 100 + innerRadius * Math.cos(radians);
    const y1 = 100 + innerRadius * Math.sin(radians);
    const x2 = 100 + outerRadius * Math.cos(radians);
    const y2 = 100 + outerRadius * Math.sin(radians);
    
    // Label position
    const labelRadius = 58;
    const labelX = 100 + labelRadius * Math.cos(radians);
    const labelY = 100 + labelRadius * Math.sin(radians);
    
    // Color based on threshold
    let tickColor = '#64748b';
    if (tickValue >= dangerThreshold) tickColor = '#ef4444';
    else if (tickValue >= warningThreshold) tickColor = '#f59e0b';
    
    ticks.push(
      <g key={i}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={tickColor}
          strokeWidth={isLarge ? 3 : 1.5}
        />
        {isLarge && (
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94a3b8"
            fontSize="10"
            fontWeight="600"
          >
            {Math.round(tickValue)}
          </text>
        )}
      </g>
    );
  }
  
  // Determine gauge color based on value
  let gaugeColor = '#22c55e'; // Green
  if (percentage * 100 >= dangerThreshold) gaugeColor = '#ef4444'; // Red
  else if (percentage * 100 >= warningThreshold) gaugeColor = '#f59e0b'; // Amber

  return (
    <div className="bg-gradient-to-b from-scada-800 to-scada-900 border-2 border-scada-600 rounded-xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-slate-200 font-bold uppercase text-sm tracking-wide">{config.title}</h3>
        <span className="text-xs text-slate-500 font-mono bg-scada-800 px-2 py-0.5 rounded">{config.sensorCode}</span>
      </div>
      
      {/* Gauge SVG */}
      <div className="relative flex justify-center">
        <svg viewBox="0 0 200 140" className="w-full max-w-[280px]">
          {/* Background arc */}
          <defs>
            <linearGradient id={`gauge-gradient-${config.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Outer ring */}
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke="#334155"
            strokeWidth="4"
          />
          
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="88"
            fill={`url(#gauge-gradient-${config.id})`}
          />
          
          {/* Colored arc showing value */}
          <path
            d={describeArc(100, 100, 82, -135, angle)}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#glow)"
          />
          
          {/* Tick marks */}
          {ticks}
          
          {/* Center hub */}
          <circle cx="100" cy="100" r="12" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          <circle cx="100" cy="100" r="6" fill={gaugeColor} filter="url(#glow)" />
          
          {/* Needle */}
          <g transform={`rotate(${angle}, 100, 100)`}>
            <polygon
              points="100,30 96,100 100,105 104,100"
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth="0.5"
            />
          </g>
        </svg>
      </div>
      
      {/* Digital readout */}
      <div className="flex flex-col items-center -mt-4">
        <div className="bg-scada-950 border border-scada-700 rounded-lg px-4 py-2 shadow-inner">
          <span className="text-3xl font-mono font-bold" style={{ color: gaugeColor }}>
            {value.toFixed(1)}
          </span>
          <span className="text-slate-400 ml-1 text-sm">{unit}</span>
        </div>
      </div>
    </div>
  );
};

// Helper function to create SVG arc path
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
