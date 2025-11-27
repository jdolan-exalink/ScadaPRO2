import React from 'react';
import { WidgetConfig } from '../../../types';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  config: WidgetConfig;
}

export const StatusWidget: React.FC<Props> = ({ config }) => {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
      <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
      <h3 className="text-slate-300 font-medium">{config.title}</h3>
      <span className="text-2xl font-bold text-white mt-1">OPERATIVO</span>
      <span className="text-xs text-emerald-400 mt-2">Desde 14:00 hoy</span>
    </div>
  );
};