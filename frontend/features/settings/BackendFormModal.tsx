import React, { useState, useEffect } from 'react';
import { BackendConnection } from '../../types';
import { adminService } from '../../services/adminService';
import { X, Save, Loader2 } from 'lucide-react';

interface Props {
  backend?: BackendConnection;
  onClose: () => void;
  onSave: () => void;
}

export const BackendFormModal: React.FC<Props> = ({ backend, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<BackendConnection>>({
    name: '',
    description: '',
    httpBaseUrl: 'http://',
    wsUrl: 'ws://',
    sshHost: '',
    sshPort: 22,
    isDefault: false,
    status: 'unknown'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (backend) {
      setFormData(backend);
    }
  }, [backend]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (backend) {
        await adminService.updateBackend({ ...backend, ...formData } as BackendConnection);
      } else {
        await adminService.createBackend(formData as BackendConnection);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving backend:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-scada-800 border border-scada-600 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-scada-700 bg-scada-900">
          <h3 className="font-bold text-white">{backend ? 'Editar Backend' : 'Nuevo Backend'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
            <input 
              type="text" 
              required
              className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Descripción</label>
            <input 
              type="text" 
              className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">HTTP URL</label>
              <input 
                type="text" 
                required
                className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none"
                value={formData.httpBaseUrl}
                onChange={e => setFormData({...formData, httpBaseUrl: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">WS URL</label>
              <input 
                type="text" 
                required
                className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none"
                value={formData.wsUrl}
                onChange={e => setFormData({...formData, wsUrl: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">SSH Host</label>
              <input 
                type="text" 
                required
                className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none"
                value={formData.sshHost}
                onChange={e => setFormData({...formData, sshHost: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">SSH Port</label>
              <input 
                type="number" 
                required
                className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none"
                value={formData.sshPort}
                onChange={e => setFormData({...formData, sshPort: parseInt(e.target.value)})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">SSH Username</label>
              <input 
                type="text" 
                className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none"
                value={formData.sshUsername || ''}
                onChange={e => setFormData({...formData, sshUsername: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">SSH Password</label>
              <input 
                type="password" 
                className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none"
                value={formData.sshPassword || ''}
                onChange={e => setFormData({...formData, sshPassword: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Docker Compose Path</label>
            <input 
              type="text" 
              placeholder="/root"
              className="w-full bg-scada-900 border border-scada-700 rounded px-3 py-2 text-white focus:border-scada-500 outline-none"
              value={formData.composePath || ''}
              onChange={e => setFormData({...formData, composePath: e.target.value})}
            />
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isDefault"
              checked={formData.isDefault}
              onChange={e => setFormData({...formData, isDefault: e.target.checked})}
              className="rounded bg-scada-900 border-scada-700 text-scada-500 focus:ring-scada-500"
            />
            <label htmlFor="isDefault" className="text-sm text-slate-300">Backend Principal</label>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white">Cancelar</button>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-scada-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              <Save size={18} /> Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
