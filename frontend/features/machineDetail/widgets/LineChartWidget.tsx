import React, { useEffect, useState } from 'react';
import { WidgetConfig } from '../../../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  config: WidgetConfig;
}

export const LineChartWidget: React.FC<Props> = ({ config }) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Generate mock history data for the sparkline
    const mockData = Array.from({ length: 20 }, (_, i) => ({
      time: i,
      value: Math.floor(Math.random() * 50) + 50
    }));
    setData(mockData);
  }, []);

  return (
    <div className="bg-scada-800 border border-scada-700 rounded-xl p-4 flex flex-col h-full min-h-[250px]">
      <h3 className="text-slate-300 font-medium mb-4">{config.title}</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis stroke="#94a3b8" fontSize={12} domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(0)} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }}
              itemStyle={{ color: '#3b82f6' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 4, fill: '#60a5fa' }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
