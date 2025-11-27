import React, { useState } from 'react';
import { WidgetConfig } from '../../../types';
import { Power, Play, Square, AlertTriangle, RotateCcw, Pause } from 'lucide-react';

interface ButtonConfig {
  id: string;
  label: string;
  icon: 'power' | 'play' | 'stop' | 'pause' | 'emergency' | 'reset';
  color: 'green' | 'red' | 'blue' | 'amber' | 'gray';
  size?: 'sm' | 'md' | 'lg';
}

interface Props {
  config: WidgetConfig;
  buttons?: ButtonConfig[];
  onPress?: (buttonId: string) => void;
}

export const PushButtonWidget: React.FC<Props> = ({ config, buttons: externalButtons, onPress }) => {
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  
  const buttons: ButtonConfig[] = externalButtons ?? [
    { id: 'start', label: 'INICIAR', icon: 'play', color: 'green', size: 'lg' },
    { id: 'stop', label: 'PARAR', icon: 'stop', color: 'red', size: 'lg' },
    { id: 'pause', label: 'PAUSA', icon: 'pause', color: 'amber', size: 'md' },
    { id: 'reset', label: 'RESET', icon: 'reset', color: 'blue', size: 'md' },
    { id: 'emergency', label: 'EMERGENCIA', icon: 'emergency', color: 'red', size: 'lg' },
  ];

  const handlePress = (id: string) => {
    setPressedButton(id);
    onPress?.(id);
    setTimeout(() => setPressedButton(null), 200);
  };

  const getIcon = (icon: string, size: number) => {
    const props = { size, strokeWidth: 2.5 };
    switch (icon) {
      case 'power': return <Power {...props} />;
      case 'play': return <Play {...props} fill="currentColor" />;
      case 'stop': return <Square {...props} fill="currentColor" />;
      case 'pause': return <Pause {...props} fill="currentColor" />;
      case 'emergency': return <AlertTriangle {...props} />;
      case 'reset': return <RotateCcw {...props} />;
      default: return <Power {...props} />;
    }
  };

  const getButtonStyles = (color: string, isPressed: boolean, isEmergency: boolean) => {
    const baseSize = isEmergency ? 'w-24 h-24' : 'w-16 h-16';
    
    const colors: Record<string, { base: string; pressed: string; ring: string; glow: string }> = {
      green: {
        base: 'bg-gradient-to-b from-emerald-400 to-emerald-600',
        pressed: 'bg-gradient-to-b from-emerald-500 to-emerald-700',
        ring: 'ring-emerald-400/50',
        glow: 'shadow-emerald-500/50'
      },
      red: {
        base: 'bg-gradient-to-b from-red-400 to-red-600',
        pressed: 'bg-gradient-to-b from-red-500 to-red-700',
        ring: 'ring-red-400/50',
        glow: 'shadow-red-500/50'
      },
      blue: {
        base: 'bg-gradient-to-b from-blue-400 to-blue-600',
        pressed: 'bg-gradient-to-b from-blue-500 to-blue-700',
        ring: 'ring-blue-400/50',
        glow: 'shadow-blue-500/50'
      },
      amber: {
        base: 'bg-gradient-to-b from-amber-400 to-amber-600',
        pressed: 'bg-gradient-to-b from-amber-500 to-amber-700',
        ring: 'ring-amber-400/50',
        glow: 'shadow-amber-500/50'
      },
      gray: {
        base: 'bg-gradient-to-b from-slate-400 to-slate-600',
        pressed: 'bg-gradient-to-b from-slate-500 to-slate-700',
        ring: 'ring-slate-400/50',
        glow: 'shadow-slate-500/50'
      },
    };
    
    const c = colors[color] || colors.gray;
    
    return {
      size: baseSize,
      bg: isPressed ? c.pressed : c.base,
      ring: c.ring,
      glow: c.glow,
    };
  };

  const emergencyButton = buttons.find(b => b.icon === 'emergency');
  const regularButtons = buttons.filter(b => b.icon !== 'emergency');

  return (
    <div className="bg-gradient-to-b from-scada-800 to-scada-900 border-2 border-scada-600 rounded-xl p-4 shadow-xl h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-200 font-bold uppercase text-sm tracking-wide">{config.title}</h3>
        <span className="text-xs text-slate-500 font-mono bg-scada-800 px-2 py-0.5 rounded">CONTROL</span>
      </div>
      
      {/* Buttons Grid */}
      <div className="flex flex-col items-center gap-4">
        {/* Regular buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          {regularButtons.map((btn) => {
            const isPressed = pressedButton === btn.id;
            const styles = getButtonStyles(btn.color, isPressed, false);
            const iconSize = btn.size === 'lg' ? 28 : btn.size === 'sm' ? 18 : 22;
            
            return (
              <div key={btn.id} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => handlePress(btn.id)}
                  className={`
                    ${styles.size} rounded-full
                    ${styles.bg}
                    border-4 border-scada-900
                    shadow-lg ${styles.glow}
                    ring-4 ${styles.ring}
                    flex items-center justify-center
                    text-white
                    transform transition-all duration-100
                    ${isPressed ? 'scale-95 shadow-md' : 'hover:scale-105 active:scale-95'}
                  `}
                >
                  {getIcon(btn.icon, iconSize)}
                </button>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{btn.label}</span>
              </div>
            );
          })}
        </div>
        
        {/* Emergency button - larger and separate */}
        {emergencyButton && (
          <div className="mt-2 flex flex-col items-center gap-1">
            <button
              onClick={() => handlePress(emergencyButton.id)}
              className={`
                w-24 h-24 rounded-full
                bg-gradient-to-b from-red-500 to-red-700
                border-8 border-yellow-400
                shadow-xl shadow-red-500/50
                ring-4 ring-red-400/50
                flex items-center justify-center
                text-white
                transform transition-all duration-100
                ${pressedButton === emergencyButton.id ? 'scale-95' : 'hover:scale-105 active:scale-95'}
                animate-pulse
              `}
            >
              <AlertTriangle size={40} strokeWidth={2.5} />
            </button>
            <span className="text-xs text-red-400 font-bold uppercase">{emergencyButton.label}</span>
          </div>
        )}
      </div>
    </div>
  );
};
