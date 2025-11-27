import React, { useState, useEffect } from 'react';
import { WidgetConfig } from '../../../types';

interface SwitchItem {
  id: string;
  label: string;
  value: boolean;
  type: 'input' | 'output';
  color?: 'green' | 'red' | 'amber' | 'blue';
}

interface Props {
  config: WidgetConfig;
  items?: SwitchItem[];
  onToggle?: (id: string, value: boolean) => void;
}

export const IndustrialSwitchWidget: React.FC<Props> = ({ config, items: externalItems, onToggle }) => {
  const [items, setItems] = useState<SwitchItem[]>(externalItems ?? [
    { id: '1', label: 'Motor Principal', value: true, type: 'output', color: 'green' },
    { id: '2', label: 'Bomba Hidráulica', value: false, type: 'output', color: 'blue' },
    { id: '3', label: 'Ventilador', value: true, type: 'output', color: 'green' },
    { id: '4', label: 'Compresor', value: false, type: 'output', color: 'amber' },
    { id: '5', label: 'Iluminación', value: true, type: 'output', color: 'blue' },
  ]);
  
  useEffect(() => {
    if (externalItems) {
      setItems(externalItems);
    }
  }, [externalItems]);

  const handleToggle = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, value: !item.value } : item
    ));
    const item = items.find(i => i.id === id);
    if (item && onToggle) {
      onToggle(id, !item.value);
    }
  };

  const getColorClasses = (color: string = 'green', isOn: boolean) => {
    if (!isOn) return { bg: 'bg-slate-700', shadow: '', indicator: 'bg-slate-600' };
    
    switch (color) {
      case 'red':
        return { bg: 'bg-red-500', shadow: 'shadow-red-500/50', indicator: 'bg-red-400' };
      case 'amber':
        return { bg: 'bg-amber-500', shadow: 'shadow-amber-500/50', indicator: 'bg-amber-400' };
      case 'blue':
        return { bg: 'bg-blue-500', shadow: 'shadow-blue-500/50', indicator: 'bg-blue-400' };
      default:
        return { bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/50', indicator: 'bg-emerald-400' };
    }
  };

  return (
    <div className="bg-gradient-to-b from-scada-800 to-scada-900 border-2 border-scada-600 rounded-xl p-4 shadow-xl h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-200 font-bold uppercase text-sm tracking-wide">{config.title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400 font-semibold">● ONLINE</span>
        </div>
      </div>
      
      {/* Switches Grid */}
      <div className="space-y-3">
        {items.map((item) => {
          const colors = getColorClasses(item.color, item.value);
          return (
            <div 
              key={item.id}
              className="flex items-center justify-between p-3 bg-scada-950 rounded-lg border border-scada-700"
            >
              {/* Label and Type */}
              <div className="flex items-center gap-3">
                {/* Status LED */}
                <div 
                  className={`w-3 h-3 rounded-full ${colors.bg} ${item.value ? `shadow-lg ${colors.shadow}` : ''}`}
                />
                <div>
                  <span className="text-sm text-slate-200 font-medium block">{item.label}</span>
                  <span className="text-[10px] text-slate-500 uppercase">{item.type === 'input' ? 'ENTRADA' : 'SALIDA'}</span>
                </div>
              </div>
              
              {/* Industrial Toggle Switch */}
              <button
                onClick={() => handleToggle(item.id)}
                className={`
                  relative w-16 h-8 rounded-full transition-all duration-300
                  border-2 border-scada-600
                  ${item.value ? colors.bg : 'bg-scada-800'}
                  ${item.value ? `shadow-lg ${colors.shadow}` : ''}
                `}
              >
                {/* Switch handle */}
                <div 
                  className={`
                    absolute top-0.5 w-6 h-6 rounded-full 
                    bg-gradient-to-b from-slate-200 to-slate-400
                    border border-slate-400 shadow-md
                    transition-all duration-300
                    ${item.value ? 'left-[34px]' : 'left-0.5'}
                  `}
                >
                  {/* Handle grip lines */}
                  <div className="absolute inset-0 flex flex-col justify-center items-center gap-0.5">
                    <div className="w-3 h-0.5 bg-slate-500 rounded" />
                    <div className="w-3 h-0.5 bg-slate-500 rounded" />
                  </div>
                </div>
                
                {/* ON/OFF Labels */}
                <span className={`absolute left-2 top-1.5 text-[8px] font-bold transition-opacity ${item.value ? 'opacity-100 text-white' : 'opacity-0'}`}>
                  ON
                </span>
                <span className={`absolute right-1.5 top-1.5 text-[8px] font-bold transition-opacity ${!item.value ? 'opacity-100 text-slate-400' : 'opacity-0'}`}>
                  OFF
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
