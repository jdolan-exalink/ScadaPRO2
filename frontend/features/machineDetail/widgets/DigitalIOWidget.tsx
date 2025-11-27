import React from 'react';
import { WidgetConfig } from '../../../types';

interface Props {
  config: WidgetConfig;
}

export const DigitalIOWidget: React.FC<Props> = ({ config }) => {
  const ioPoints = [
    { label: 'Botón Inicio', value: true, type: 'in' },
    { label: 'Relé Seguridad', value: true, type: 'in' },
    { label: 'Contactor Motor', value: true, type: 'out' },
    { label: 'Válvula Alim.', value: false, type: 'out' },
    { label: 'Sirena Alarma', value: false, type: 'out' },
  ];

  return (
    <div className="bg-scada-800 border border-scada-700 rounded-xl p-4 h-full">
      <h3 className="text-slate-300 font-medium mb-4">{config.title}</h3>
      <div className="space-y-3">
        {ioPoints.map((point, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 bg-scada-900 rounded border border-scada-700">
            <span className="text-sm text-slate-300">{point.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-slate-500 font-bold">{point.type}</span>
              <div 
                className={`w-3 h-3 rounded-full shadow-lg ${point.value ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-slate-700'}`}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};