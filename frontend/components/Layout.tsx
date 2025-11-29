
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Factory, History, Settings, Menu, X, Server, Activity, BellRing, Database, Grid, LogOut } from 'lucide-react';
import { useAppContext } from '../App';
import { useAuth } from '../features/auth/useAuth';
import { scadaBackendService } from '../services/scadaBackendService';

const APP_VERSION = '0.1.0';


export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [criticalAlarmCount, setCriticalAlarmCount] = useState(0);
  const { currentBackend, backends, setCurrentBackend, isFullscreen } = useAppContext();
  const { logout, user } = useAuth();
  const location = useLocation();

  // Cargar contador de alarmas críticas
  useEffect(() => {
    const loadCriticalCount = async () => {
      try {
        const result = await scadaBackendService.getCriticalAlarmsCount();
        if (result) {
          setCriticalAlarmCount(result.count);
        }
      } catch (error) {
        console.error('Failed to load critical alarm count:', error);
      }
    };

    loadCriticalCount();
    // Actualizar cada 30 segundos
    const interval = setInterval(loadCriticalCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { icon: Factory, label: 'Detalle Máquina', path: '/machines' },
    { icon: Grid, label: 'Tableros', path: '/boards' },
    { icon: History, label: 'Historial', path: '/history' },
    { icon: BellRing, label: 'Alarmas', path: '/alarms' },
    { icon: Database, label: 'Inventario', path: '/inventory' },
    { icon: Settings, label: 'Configuración', path: '/settings' },
  ];

  const handleBackendChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const backend = backends.find(b => b.id === e.target.value);
    if (backend) setCurrentBackend(backend);
  };

  return (
    <div className="flex h-screen bg-scada-900 text-slate-100 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && !isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden in fullscreen mode */}
      {!isFullscreen && (
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-scada-800 border-r border-scada-700 transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-scada-700 h-16">
          <div>
            <div className="flex items-center gap-2 text-scada-500">
              <Activity className="h-8 w-8" />
              <span className="font-bold text-xl tracking-tight text-white">SCADA<span className="text-scada-500">Pro</span></span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">v{APP_VERSION}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center justify-between px-4 py-3 rounded-md transition-colors
                ${isActive || (item.path.includes('/machines') && location.pathname.includes('/machines')) 
                  ? 'bg-scada-500 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:bg-scada-700 hover:text-white'}
              `}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </div>
              {/* Badge para alarmas críticas */}
              {item.path === '/alarms' && criticalAlarmCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
                  {criticalAlarmCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-scada-700 space-y-3">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span>Sistema Online</span>
          </div>
          {user && (
            <div className="text-xs text-slate-500 border-t border-scada-600 pt-3">
              <p>Usuario: <span className="text-slate-400 font-medium">{user.username}</span></p>
              <p>Rol: <span className="text-slate-400 font-medium capitalize">{user.role}</span></p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-slate-400 hover:text-white hover:bg-scada-700 transition-colors text-sm"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - Hidden in fullscreen mode */}
        {!isFullscreen && (
        <header className="h-16 bg-scada-800 border-b border-scada-700 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-white hidden sm:block">
              {navItems.find(i => location.pathname.startsWith(i.path))?.label || 'Resumen'}
            </h1>
          </div>
          
          {/* Right side empty as requested */}
          <div></div>
        </header>
        )}

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-scada-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
