import React, { useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';

interface MqttErrorDisplayProps {
  mqttConnected: boolean;
  brokerUrl?: string;
  onReconnect?: () => void;
}

export const MqttErrorDisplay: React.FC<MqttErrorDisplayProps> = ({
  mqttConnected,
  brokerUrl = 'mqtt://10.147.18.10:1883',
  onReconnect
}) => {
  const [reconnecting, setReconnecting] = useState(false);

  const handleReconnect = async () => {
    if (!onReconnect) return;
    setReconnecting(true);
    try {
      await onReconnect();
    } finally {
      setReconnecting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-96 gap-6">
      <div className="w-20 h-20 rounded-full bg-scada-800 border-2 border-scada-600 flex items-center justify-center">
        <Radio size={40} className={mqttConnected ? "text-emerald-400" : "text-red-400"} />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Esperando Datos MQTT</h2>
        <p className="text-slate-400 mb-4">
          {mqttConnected
            ? "Conectado al broker MQTT. Esperando mensajes de máquinas..."
            : "No se puede conectar al broker MQTT. Verifica la conexión."
          }
        </p>
        <div className="flex items-center justify-center gap-2 text-sm mb-4">
          <div className={`w-3 h-3 rounded-full ${mqttConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-slate-500">
            Broker: {brokerUrl}
          </span>
        </div>
        {onReconnect && (
          <button 
            onClick={handleReconnect}
            disabled={reconnecting}
            className={`px-4 py-2 bg-scada-700 border border-scada-600 rounded-lg text-white hover:bg-scada-600 transition-colors flex items-center gap-2 mx-auto ${reconnecting ? 'opacity-50' : ''}`}
          >
            <RefreshCw size={16} className={reconnecting ? 'animate-spin' : ''} />
            Reconectar MQTT
          </button>
        )}
      </div>
    </div>
  );
};