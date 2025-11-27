import React, { useState, useEffect } from 'react';
import { WidgetConfig } from '../../../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Props {
  config: WidgetConfig;
}

export const GaugeWidget: React.FC<Props> = ({ config }) => {
  const [value, setValue] = useState(0);
  const min = config.config?.min || 0;
  const max = config.config?.max || 100;
  
  useEffect(() => {
    // Simulate WebSocket real-time data
    const interval = setInterval(() => {
      setValue(Math.floor(Math.random() * (max - min) + min));
    }, 2000);
    return () => clearInterval(interval);
  }, [min, max]);

  // Calculate gauge data
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = ((normalizedValue - min) / (max - min)) * 100;
  
  const data = [
    { name: 'value', value: percentage },
    { name: 'rest', value: 100 - percentage }
  ];

  const getColor = (percent: number) => {
    if (percent > 80) return '#ef4444'; // Red
    if (percent > 60) return '#f59e0b'; // Amber
    return '#3b82f6'; // Blue
  };

  return (
    <div className="bg-scada-800 border border-scada-700 rounded-xl p-4 flex flex-col h-full min-h-[200px]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-slate-300 font-medium">{config.title}</h3>
        <span className="text-xs text-slate-500 font-mono">{config.sensorCode}</span>
      </div>
      
      <div className="flex-1 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="70%"
              startAngle={180}
              endAngle={0}
              innerRadius={40}
              outerRadius={55}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={getColor(percentage)} />
              <Cell fill="#334155" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-[65%] text-center">
          <span className="text-2xl font-bold text-white block leading-none">{value}</span>
          <span className="text-xs text-slate-400">{config.config?.unit || ''}</span>
        </div>
      </div>
    </div>
  );
};
