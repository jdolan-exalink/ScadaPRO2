import React, { useState, useEffect } from 'react';
import { WidgetConfig } from '../../../types';

interface LEDItem {
  id: string;
  label: string;
  value: boolean;
  color: 'green' | 'red' | 'amber' | 'blue' | 'white';
  blink?: boolean;
}

interface Props {
  config: WidgetConfig;
  items?: LEDItem[];
}

export const LEDIndicatorWidget: React.FC<Props> = ({ config, items: externalItems }) => {
  const [items, setItems] = useState<LEDItem[]>(externalItems ?? [
    { id: '1', label: 'Sistema Listo', value: true, color: 'green' },
    { id: '2', label: 'En Producción', value: true, color: 'blue', blink: false },
    { id: '3', label: 'Mantenimiento', value: false, color: 'amber' },
    { id: '4', label: 'Alarma', value: false, color: 'red', blink: true },
    { id: '5', label: 'Comunicación', value: true, color: 'white', blink: true },
    { id: '6', label: 'Emergencia', value: false, color: 'red' },
  ]);
  
  const [blinkState, setBlinkState] = useState(true);
  
  useEffect(() => {
    if (externalItems) {
      setItems(externalItems);
    }
  }, [externalItems]);
  
  // Blink effect
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkState(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Simulate some data changes
  useEffect(() => {
    const interval = setInterval(() => {
      setItems(prev => prev.map(item => {
        if (item.id === '5') {
          return { ...item, value: Math.random() > 0.1 };
        }
        return item;
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getLEDStyles = (color: string, isOn: boolean, blink?: boolean) => {
    const shouldShow = blink ? (isOn && blinkState) : isOn;
    
    const colors: Record<string, { on: string; off: string; glow: string }> = {
      green: { on: 'bg-emerald-400', off: 'bg-emerald-950', glow: 'shadow-emerald-400/60' },
      red: { on: 'bg-red-500', off: 'bg-red-950', glow: 'shadow-red-500/60' },
      amber: { on: 'bg-amber-400', off: 'bg-amber-950', glow: 'shadow-amber-400/60' },
      blue: { on: 'bg-blue-400', off: 'bg-blue-950', glow: 'shadow-blue-400/60' },
      white: { on: 'bg-slate-100', off: 'bg-slate-800', glow: 'shadow-slate-100/60' },
    };
    
    const c = colors[color] || colors.green;
    
    return {
      bg: shouldShow ? c.on : c.off,
      glow: shouldShow ? `shadow-lg ${c.glow}` : '',
    };
  };

  return (
    <div className="bg-gradient-to-b from-scada-800 to-scada-900 border-2 border-scada-600 rounded-xl p-4 shadow-xl h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-200 font-bold uppercase text-sm tracking-wide">{config.title}</h3>
        <span className="text-xs text-slate-500 font-mono bg-scada-800 px-2 py-0.5 rounded">I/O STATUS</span>
      </div>
      
      {/* LED Grid */}
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const styles = getLEDStyles(item.color, item.value, item.blink);
          return (
            <div 
              key={item.id}
              className="flex items-center gap-3 p-2.5 bg-scada-950 rounded-lg border border-scada-700"
            >
              {/* LED Bezel */}
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-scada-700 border-2 border-scada-600 flex items-center justify-center shadow-inner">
                  <div 
                    className={`
                      w-4 h-4 rounded-full transition-all duration-150
                      ${styles.bg} ${styles.glow}
                    `}
                  />
                </div>
              </div>
              
              {/* Label */}
              <span className="text-xs text-slate-300 font-medium leading-tight">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
