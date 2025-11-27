import React, { useState, useEffect } from 'react';
import { BackendConnection } from '../../types';
import { adminService } from '../../services/adminService';
import { Terminal, X, RefreshCw, Play } from 'lucide-react';

interface Props {
  backend: BackendConnection;
  onClose: () => void;
}

export const LogsModal: React.FC<Props> = ({ backend, onClose }) => {
  const [username, setUsername] = useState(backend.sshUsername || 'root');
  const [password, setPassword] = useState(backend.sshPassword || '');
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [composePath, setComposePath] = useState(backend.composePath || '/root');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Use docker-compose logs -f (simulated with tail since -f streams indefinitely)
      // We'll use --tail 100 to get recent logs
      const command = `cd ${composePath} && docker-compose logs --tail 100`;
      const result = await adminService.executeSSHCommandGeneric(backend.id, command, { username, password });
      
      if (result.success) {
        setLogs(result.output);
      } else {
        setLogs(`Error fetching logs: ${result.output}`);
      }
    } catch (error) {
      setLogs('Error connecting to backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-scada-800 border border-scada-600 rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col h-[80vh]">
        <div className="flex justify-between items-center p-4 border-b border-scada-700 bg-scada-900">
          <div className="flex items-center gap-2">
            <Terminal className="text-scada-500" />
            <h3 className="font-bold text-white">Logs del Contenedor - {backend.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        
        <div className="p-4 bg-scada-900 border-b border-scada-700 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Usuario SSH</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              className="bg-scada-800 border border-scada-700 rounded px-2 py-1 text-sm text-white w-32"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Contraseña SSH</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="bg-scada-800 border border-scada-700 rounded px-2 py-1 text-sm text-white w-32"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Ruta Compose</label>
            <input 
              type="text" 
              value={composePath} 
              onChange={e => setComposePath(e.target.value)}
              className="bg-scada-800 border border-scada-700 rounded px-2 py-1 text-sm text-white w-40"
            />
          </div>
          <button 
            onClick={fetchLogs}
            disabled={loading}
            className="bg-scada-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} />}
            Ver Logs
          </button>
        </div>

        <div className="flex-1 bg-black p-4 overflow-auto font-mono text-xs text-green-400 whitespace-pre-wrap">
          {logs || <span className="text-slate-600">Esperando logs... (Ingrese credenciales y ejecute)</span>}
        </div>
      </div>
    </div>
  );
};
