import React, { useState } from 'react';
import { BackendConnection } from '../../types';
import { adminService } from '../../services/adminService';
import { Terminal, Lock, X, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
  backend: BackendConnection;
  action: 'restart' | 'test';
  onClose: () => void;
}

export const SSHModal: React.FC<Props> = ({ backend, action, onClose }) => {
  const [username, setUsername] = useState(backend.sshUsername || 'root');
  const [password, setPassword] = useState(backend.sshPassword || '');
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [log, setLog] = useState('');

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('running');
    setLog(`Conectando a ${backend.sshHost} como ${username}...\n`);
    
    try {
      const command = action === 'restart' ? 'restart_service' : 'test_connection';
      const result = await adminService.executeSSHCommand(backend.id, command, { username, password });
      
      setLog(prev => prev + result.output);
      setStatus(result.success ? 'success' : 'error');
    } catch (err) {
      setLog(prev => prev + '\nError: Tiempo de espera agotado o conexión fallida.');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-scada-800 border border-scada-600 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-scada-700 bg-scada-900">
          <div className="flex items-center gap-2">
            <Terminal className="text-scada-500" />
            <h3 className="font-bold text-white">
              {action === 'restart' ? 'Reiniciar Servicio Remoto' : 'Probar Conexión SSH'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {action === 'restart' && (
             <div className="mb-4 bg-amber-500/10 border border-amber-500/20 p-3 rounded flex gap-3 text-amber-200 text-sm">
               <AlertTriangle className="shrink-0" size={18} />
               <p>Advertencia: Esto reiniciará el servicio backend industrial en <strong>{backend.name}</strong>. La recolección de datos podría interrumpirse por unos segundos.</p>
             </div>
          )}

          {status === 'idle' ? (
            <form onSubmit={handleRun} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Host SSH</label>
                <input 
                  disabled 
                  value={`${backend.sshHost}:${backend.sshPort}`} 
                  className="w-full bg-scada-900 border border-scada-700 rounded p-2 text-slate-300 text-sm cursor-not-allowed" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Usuario</label>
                <input 
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-scada-900 border border-scada-700 rounded p-2 text-white focus:border-scada-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Contraseña / Passphrase</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-500" size={14} />
                  <input 
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Ingresar contraseña SSH"
                    className="w-full bg-scada-900 border border-scada-700 rounded p-2 pl-9 text-white focus:border-scada-500 outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded text-slate-300 hover:bg-scada-700 text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded bg-scada-500 hover:bg-blue-600 text-white text-sm font-medium shadow-lg shadow-blue-500/20"
                >
                  Ejecutar Comando
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-black rounded-lg p-4 font-mono text-xs text-emerald-500 min-h-[150px] whitespace-pre-wrap overflow-x-auto border border-scada-700">
                {log}
                {status === 'running' && <span className="animate-pulse">_</span>}
              </div>
              
              <div className="flex justify-end">
                {status === 'running' ? (
                  <button disabled className="flex items-center gap-2 px-4 py-2 rounded bg-scada-700 text-slate-400 cursor-not-allowed">
                    <Loader2 className="animate-spin" size={16} /> Ejecutando...
                  </button>
                ) : (
                  <button onClick={onClose} className="px-4 py-2 rounded bg-scada-700 hover:bg-scada-600 text-white text-sm">
                    Cerrar Consola
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};