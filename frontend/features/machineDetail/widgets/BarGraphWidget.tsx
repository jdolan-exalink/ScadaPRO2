import React, { useState, useEffect } from 'react';
import { WidgetConfig } from '../../../types';

interface BarItem {
  id: string;
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'purple';
}

interface Props {
  config: WidgetConfig;
  items?: BarItem[];
}

export const BarGraphWidget: React.FC<Props> = ({ config, items: externalItems }) => {
  const [items, setItems] = useState<BarItem[]>(externalItems ?? [
    { id: '1', label: 'Presión', value: 75, max: 100, unit: 'bar', color: 'blue' },
    { id: '2', label: 'Temperatura', value: 45, max: 120, unit: '°C', color: 'amber' },
    { id: '3', label: 'Velocidad', value: 1450, max: 1800, unit: 'RPM', color: 'green' },
    { id: '4', label: 'Carga', value: 82, max: 100, unit: '%', color: 'purple' },
  ]);
  
  useEffect(() => {
    if (externalItems) {
      setItems(externalItems);
      return;
    }
    // Simulate data
    const interval = setInterval(() => {
      setItems(prev => prev.map(item => ({
        ...item,
        value: Math.min(item.max, Math.max(0, item.value + (Math.random() - 0.5) * item.max * 0.1))
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, [externalItems]);

  const getBarColor = (color: string = 'green', percentage: number) => {
    // Override color if in danger zone
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 75) return 'bg-amber-500';
    
    const colors: Record<string, string> = {
      green: 'bg-emerald-500',
      blue: 'bg-blue-500',
      amber: 'bg-amber-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500',
    };
    return colors[color] || colors.green;
  };
  
  const getGlowColor = (color: string = 'green') => {
    const glows: Record<string, string> = {
      green: 'shadow-emerald-500/40',
      blue: 'shadow-blue-500/40',
      amber: 'shadow-amber-500/40',
      red: 'shadow-red-500/40',
      purple: 'shadow-purple-500/40',
    };
    return glows[color] || glows.green;
  };

  return (
    <div className="bg-gradient-to-b from-scada-800 to-scada-900 border-2 border-scada-600 rounded-xl p-4 shadow-xl h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-200 font-bold uppercase text-sm tracking-wide">{config.title}</h3>
        <span className="text-xs text-slate-500 font-mono bg-scada-800 px-2 py-0.5 rounded">LIVE</span>
      </div>
      
      {/* Bar Graphs */}
      <div className="space-y-4">
        {items.map((item) => {
          const percentage = (item.value / item.max) * 100;
          const barColor = getBarColor(item.color, percentage);
          const glowColor = getGlowColor(item.color);
          
          return (
            <div key={item.id} className="space-y-1">
              {/* Label and Value */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">{item.label}</span>
                <span className="text-sm text-slate-200 font-mono font-bold">
                  {item.value.toFixed(1)} <span className="text-slate-500 text-xs">{item.unit}</span>
                </span>
              </div>
              
              {/* Bar Container */}
              <div className="relative h-6 bg-scada-950 rounded border border-scada-700 overflow-hidden">
                {/* Tick marks */}
                <div className="absolute inset-0 flex">
                  {[25, 50, 75].map((tick) => (
                    <div 
                      key={tick}
                      className="absolute h-full border-l border-scada-700"
                      style={{ left: `${tick}%` }}
                    />
                  ))}
                </div>
                
                {/* Value bar */}
                <div 
                  className={`
                    absolute top-0.5 left-0.5 bottom-0.5 rounded-sm
                    ${barColor} shadow-lg ${glowColor}
                    transition-all duration-500 ease-out
                  `}
                  style={{ width: `calc(${Math.min(percentage, 100)}% - 4px)` }}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-sm" />
                </div>
                
                {/* Percentage label */}
                <div className="absolute inset-0 flex items-center justify-end pr-2">
                  <span className="text-[10px] font-bold text-white/80 drop-shadow">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
