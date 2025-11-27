import React, { useState, useEffect } from 'react';
import { WidgetConfig } from '../../../types';

interface Props {
  config: WidgetConfig;
  value?: number | string;
}

export const DigitalDisplayWidget: React.FC<Props> = ({ config, value: externalValue }) => {
  const [value, setValue] = useState<number | string>(externalValue ?? 0);
  const unit = config.config?.unit ?? '';
  const label = config.config?.label ?? config.title;
  const decimals = config.config?.decimals ?? 1;
  const min = config.config?.min ?? 0;
  const max = config.config?.max ?? 9999;
  
  useEffect(() => {
    if (externalValue !== undefined) {
      setValue(externalValue);
      return;
    }
    // Simulate data
    const interval = setInterval(() => {
      setValue(parseFloat((Math.random() * (max - min) + min).toFixed(decimals)));
    }, 2000);
    return () => clearInterval(interval);
  }, [externalValue, min, max, decimals]);

  const displayValue = typeof value === 'number' ? value.toFixed(decimals) : value;
  const digits = displayValue.toString().padStart(6, ' ').split('');

  return (
    <div className="bg-gradient-to-b from-scada-800 to-scada-900 border-2 border-scada-600 rounded-xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-slate-200 font-bold uppercase text-sm tracking-wide">{label}</h3>
        <span className="text-xs text-slate-500 font-mono bg-scada-800 px-2 py-0.5 rounded">{config.sensorCode}</span>
      </div>
      
      {/* 7-Segment Style Display */}
      <div className="bg-scada-950 rounded-lg p-4 border border-scada-700 shadow-inner">
        <div className="flex justify-center items-baseline gap-1">
          {digits.map((digit, idx) => (
            <div 
              key={idx}
              className={`
                font-mono text-4xl font-bold
                ${digit === '.' ? 'text-red-500 -mx-1' : 'text-emerald-400'}
                ${digit === ' ' ? 'opacity-20' : ''}
              `}
              style={{ 
                textShadow: digit !== ' ' && digit !== '.' ? '0 0 10px rgba(52, 211, 153, 0.5)' : 'none',
                fontFamily: "'Segment7', 'Courier New', monospace"
              }}
            >
              {digit === ' ' ? '8' : digit}
            </div>
          ))}
          <span className="text-emerald-400 text-xl ml-2 font-semibold">{unit}</span>
        </div>
      </div>
      
      {/* Status bar */}
      <div className="flex justify-between items-center mt-3 text-xs text-slate-500">
        <span>Min: {min} {unit}</span>
        <span>Max: {max} {unit}</span>
      </div>
    </div>
  );
};
