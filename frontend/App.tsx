
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { useAuth } from './features/auth/useAuth';
import { Dashboard } from './features/dashboard/Dashboard';
import { BoardsPage } from './features/boards/BoardsPage';
import { MachineDetailLive } from './features/machineDetail/MachineDetailLive';
import { HistoryPage } from './features/history/HistoryPage';
import { AlarmsPage } from './features/alarms/AlarmsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { InventoryPage } from './features/inventory/InventoryPage';
import { BackendConnection } from './types';
import { adminService } from './services/adminService';
import { boardService } from './services/boardService';

// --- Global Context ---
interface AppContextType {
  backends: BackendConnection[];
  currentBackend: BackendConnection | null;
  setCurrentBackend: (backend: BackendConnection) => void;
  refreshBackends: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage onLoginSuccess={() => {}} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/machines" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route
          path="boards"
          element={
            <ProtectedRoute requiredPermission="view_all">
              <BoardsPage />
            </ProtectedRoute>
          }
        />
        <Route path="machines" element={<MachineDetailLive />} />
        <Route path="machines/:machineId" element={<MachineDetailLive />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="alarms" element={<AlarmsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route
          path="settings"
          element={
            <ProtectedRoute requiredPermission="edit_config">
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
};
  const [backends, setBackends] = useState<BackendConnection[]>([]);
  const [currentBackend, setCurrentBackend] = useState<BackendConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBackends = async () => {
    try {
      const list = await adminService.getBackends();
      setBackends(list);
      
      // Select default if nothing selected
      if (!currentBackend && list.length > 0) {
        const defaultBackend = list.find(b => b.isDefault) || list[0];
        setCurrentBackend(defaultBackend);
      } else if (currentBackend) {
        // Update current backend object if it changed in the list
        const updated = list.find(b => b.id === currentBackend.id);
        if (updated) setCurrentBackend(updated);
      }
    } catch (error) {
      console.error("Failed to load backends", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      await refreshBackends();
      await boardService.initialize();
    };
    initializeApp();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-scada-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-scada-500 border-t-transparent rounded-full animate-spin"></div>
          <p>Loading SCADA System...</p>
        </div>
      </div>
    );
  }

  return (
    <AppWrapper>
      <AppRoutes />
    </AppWrapper>
  );
};

const AppWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [backends, setBackends] = useState<BackendConnection[]>([]);
  const [currentBackend, setCurrentBackend] = useState<BackendConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBackends = async () => {
    try {
      const list = await adminService.getBackends();
      setBackends(list);
      
      if (!currentBackend && list.length > 0) {
        const defaultBackend = list.find(b => b.isDefault) || list[0];
        setCurrentBackend(defaultBackend);
      } else if (currentBackend) {
        const updated = list.find(b => b.id === currentBackend.id);
        if (updated) setCurrentBackend(updated);
      }
    } catch (error) {
      console.error("Failed to load backends", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      await refreshBackends();
      await boardService.initialize();
    };
    initializeApp();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-scada-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-scada-500 border-t-transparent rounded-full animate-spin"></div>
          <p>Loading SCADA System...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ backends, currentBackend, setCurrentBackend, refreshBackends }}>
      <HashRouter>
        {children}
      </HashRouter>
    </AppContext.Provider>
  );
};

const AppComponent: React.FC = () => {
  return (
    <AppWrapper>
      <App />
    </AppWrapper>
  );
};

export default AppComponent;
