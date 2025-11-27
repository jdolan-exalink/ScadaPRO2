
import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Factory, History, Settings, Menu, X, Server, Activity, BellRing, Database, Grid } from 'lucide-react';
import { useAppContext } from '../App';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentBackend, backends, setCurrentBackend } = useAppContext();
  const location = useLocation();

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
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-scada-800 border-r border-scada-700 transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-scada-700 h-16">
          <div className="flex items-center gap-2 text-scada-500">
            <Activity className="h-8 w-8" />
            <span className="font-bold text-xl tracking-tight text-white">SCADA<span className="text-scada-500">Pro</span></span>
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
                flex items-center gap-3 px-4 py-3 rounded-md transition-colors
                ${isActive || (item.path.includes('/machines') && location.pathname.includes('/machines')) 
                  ? 'bg-scada-500 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:bg-scada-700 hover:text-white'}
              `}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-scada-700">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span>Sistema Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
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

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-scada-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
