/**
 * Boards Page - Dashboard/Boards Management Interface
 * Features:
 * - Multiple boards management
 * - Tabs for different machines  
 * - Add/remove widgets
 * - Save/load configurations
 */

import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../../App';
import { MqttErrorDisplay } from '../../components/MqttErrorDisplay';
import { scadaBackendService } from '../../services/scadaBackendService';
import { boardService } from '../../services/boardService';
import { Board, BoardTab, BoardWidgetLayout, Machine, Sensor, PLC } from '../../types';
import {
  Plus, X, Download, Upload, Settings, Save, Trash2, GripHorizontal, ChevronDown, Maximize, Minimize, Server,
} from 'lucide-react';
import { GaugeWidget, KPIWidget, StatusWidget, LineChartWidget } from './BoardWidgets';

export const BoardsPage: React.FC = () => {
  const { currentBackend } = useAppContext();
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [currentTab, setCurrentTab] = useState<BoardTab | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [plcs, setPlcs] = useState<PLC[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [boardNameError, setBoardNameError] = useState('');
  const [showSensorSelector, setShowSensorSelector] = useState(false);
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [selectedMachineForTab, setSelectedMachineForTab] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const boardMenuRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      if (!currentBackend) return;
      setLoading(true);
      try {
        // Migrate from localStorage to SQLite if needed
        await boardService.migrateFromLocalStorage();

        let loadedBoards = await boardService.getBoards();
        if (loadedBoards.length === 0) {
          const sampleBoard = await boardService.initializeSampleBoard();
          if (sampleBoard) {
            loadedBoards = [sampleBoard];
            boardService.setDefaultBoard(sampleBoard.id);
          }
        }
        setBoards(loadedBoards);

        let defaultBoard = await boardService.getDefaultBoard();
        if (!defaultBoard && loadedBoards.length > 0) {
          defaultBoard = loadedBoards[0];
          boardService.setDefaultBoard(defaultBoard.id);
        }
        setCurrentBoard(defaultBoard);
        if (defaultBoard && defaultBoard.tabs.length > 0) {
          setCurrentTab(defaultBoard.tabs.find((t) => t.isActive) || defaultBoard.tabs[0]);
        }

        const [m, p, s] = await Promise.all([
          scadaBackendService.getMachines(),
          scadaBackendService.getPLCs(),
          scadaBackendService.getSensors(),
        ]);
        setMachines(m);
        setPlcs(p);
        setSensors(s);
        
        // Check MQTT status
        try {
          const response = await fetch('/api/mqtt/stats');
          if (response.ok) {
            const statusData = await response.json();
            setMqttConnected(statusData.connected === true);
          } else {
            setMqttConnected(m.length > 0);
          }
        } catch {
          setMqttConnected(m.length > 0);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    if (currentBackend) init();
  }, [currentBackend]);

  // MQTT reconnect handler
  const handleMqttReconnect = async () => {
    try {
      const response = await fetch('/api/mqtt/reconnect', { method: 'POST' });
      if (response.ok) {
        // Reload data after reconnect
        window.location.reload();
      }
    } catch (error) {
      console.error('Error reconnecting MQTT:', error);
    }
  };

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (boardMenuRef.current && !boardMenuRef.current.contains(event.target as Node)) {
        setShowBoardMenu(false);
        setBoardNameError('');
      }
    };

    if (showBoardMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBoardMenu]);

  const createNewBoard = async () => {
    if (!newBoardName.trim()) {
      setBoardNameError('El nombre es requerido');
      return;
    }

    // Check for duplicate names
    const isDuplicate = boards.some(board =>
      board.name.toLowerCase() === newBoardName.trim().toLowerCase()
    );

    if (isDuplicate) {
      setBoardNameError('Ya existe un tablero con este nombre');
      return;
    }

    setBoardNameError('');
    const newBoard = await boardService.createBoard(newBoardName.trim());
    const updatedBoards = await boardService.getBoards();
    setBoards(updatedBoards);
    setCurrentBoard(newBoard);
    boardService.setDefaultBoard(newBoard.id);
    setNewBoardName('');
    setShowBoardMenu(false);

    // Automatically open the add tab modal for the new board
    setShowAddTabModal(true);
  };

  const deleteBoard = async (boardId: string) => {
    if (!window.confirm('¿Eliminar este tablero?')) return;
    await boardService.deleteBoard(boardId);
    const updatedBoards = await boardService.getBoards();
    setBoards(updatedBoards);
    if (currentBoard?.id === boardId) {
      const newBoard = updatedBoards.length > 0 ? updatedBoards[0] : null;
      setCurrentBoard(newBoard);
      if (newBoard) boardService.setDefaultBoard(newBoard.id);
    }
  };

  const addTab = async (machineId: number) => {
    if (!currentBoard) return;
    const machine = machines.find((m) => m.id === machineId);
    if (!machine) return;
    const newTab = await boardService.addTab(currentBoard.id, machine.id, machine.code, machine.name);
    if (newTab) {
      const updatedBoard = await boardService.getBoard(currentBoard.id);
      setCurrentBoard(updatedBoard);
      setCurrentTab(newTab);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  // Handle fullscreen changes from browser (F11, etc.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const switchTab = async (tab: BoardTab) => {
    if (!currentBoard) return;
    const updatedBoard = await boardService.updateBoard(currentBoard.id, {
      tabs: currentBoard.tabs.map((t) => ({ ...t, isActive: t.id === tab.id })),
    });
    if (updatedBoard) {
      setCurrentBoard(updatedBoard);
      setCurrentTab(tab);
    }
  };

  const deleteTab = async (tabId: string) => {
    if (!currentBoard) return;
    await boardService.deleteTab(currentBoard.id, tabId);
    const updatedBoard = await boardService.getBoard(currentBoard.id);
    setCurrentBoard(updatedBoard || null);
    if (updatedBoard && updatedBoard.tabs.length > 0) {
      setCurrentTab(updatedBoard.tabs[0]);
    }
  };

  const addWidget = async (sensorId: number) => {
    if (!currentBoard || !currentTab) return;
    const sensor = sensors.find((s) => s.id === sensorId);
    if (!sensor) return;
    const widget: Omit<BoardWidgetLayout, 'id'> = {
      type: sensor.type.toLowerCase().includes('temp') || sensor.type.toLowerCase().includes('humid') ? 'gauge' : 'status',
      title: sensor.name,
      sensorCode: sensor.code,
      sensorName: sensor.name,
      unit: sensor.unit,
      machineId: currentTab.machineId,
      machineCode: currentTab.machineCode,
      x: 0, y: 0, w: 1, h: 1,
    };
    const newWidget = await boardService.addWidget(currentBoard.id, currentTab.id, widget);
    if (newWidget) {
      const updatedTab = await boardService.getTab(currentBoard.id, currentTab.id);
      setCurrentTab(updatedTab);
      setShowSensorSelector(false);
    }
  };

  const deleteWidget = async (widgetId: string) => {
    if (!currentBoard || !currentTab) return;
    await boardService.deleteWidget(currentBoard.id, currentTab.id, widgetId);
    const updatedTab = await boardService.getTab(currentBoard.id, currentTab.id);
    setCurrentTab(updatedTab);
  };

  const exportBoard = async () => {
    if (!currentBoard) return;
    const json = await boardService.exportBoard(currentBoard.id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentBoard.name}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const importBoard = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const imported = await boardService.importBoard(json);
        if (imported) {
          const updatedBoards = await boardService.getBoards();
          setBoards(updatedBoards);
          setCurrentBoard(imported);
          boardService.setDefaultBoard(imported.id);
        }
      } catch (error) {
        alert('Error al importar');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p>Cargando...</p></div>;
  }

  if (machines.length === 0) {
    return <MqttErrorDisplay mqttConnected={mqttConnected} onReconnect={handleMqttReconnect} />;
  }

  if (!currentBoard) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Tableros</h1>
        <div className="text-center py-12">
          <button
            onClick={() => {
              setShowBoardMenu(true);
              setBoardNameError('');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Crear Primer Tablero
          </button>
        </div>
      </div>
    );
  }

  // Helper function to get sensors for a machine
  const getSensorsForMachine = (machineCode: string): Sensor[] => {
    // Filter sensors by machine code - flexible pattern matching
    // For "sec21", look for sensors containing "sec21", "21", or ending with "_21"
    return sensors.filter(sensor => {
      const code = sensor.code.toLowerCase();
      const machine = machineCode.toLowerCase();

      // Direct match
      if (code.includes(machine)) return true;

      // For machines like "sec21", also match "21" patterns
      if (machine.startsWith('sec') && machine.length > 3) {
        const numberPart = machine.substring(3); // "21" from "sec21"
        if (code.includes(`_${numberPart}`) || code.endsWith(`_${numberPart}`)) return true;
      }

      return false;
    });
  };

  const availableSensors = (() => {
    if (!currentTab) return [];
    // Get sensors for current tab's machine
    const machineSensors = getSensorsForMachine(currentTab.machineCode);
    // Filter out sensors already used in this tab
    return machineSensors.filter(sensor =>
      !currentTab.widgets.some((w) => w.sensorCode === sensor.code)
    );
  })();

  return (
    <div className={`flex flex-col h-screen bg-scada-900 ${isFullscreen ? 'p-6' : ''}`}>
      {/* Header Bar - Updated with MachineDetailLive aesthetics */}
      <div className="bg-gradient-to-r from-scada-800 via-scada-800 to-scada-850 border-2 border-scada-600 rounded-xl p-4 shadow-xl mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: Board Info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-scada-700 border border-scada-600 flex items-center justify-center">
              <Server size={24} className="text-emerald-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Tablero SCADA</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div>
                <h1 className="text-xl font-bold text-white">{currentBoard.name}</h1>
                <p className="text-sm text-scada-400">{currentBoard.description}</p>
              </div>
            </div>
          </div>

          {/* Center: Tab Navigation */}
          {currentBoard.tabs.length > 0 && (
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2 bg-scada-900/50 rounded-lg p-2">
                {currentBoard.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      tab.id === currentTab?.id
                        ? 'bg-emerald-500 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-scada-700 hover:text-white'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBoardMenu(!showBoardMenu)}
              className="px-4 py-2 bg-scada-700 border-2 border-scada-600 text-slate-300 rounded-lg hover:bg-scada-600 hover:text-white hover:border-scada-500 transition-all flex items-center gap-2"
            >
              <Server size={18} />
              Tableros
            </button>

            {currentTab && (
              <button
                onClick={() => setShowSensorSelector(!showSensorSelector)}
                className="px-4 py-2 bg-scada-700 border-2 border-scada-600 text-slate-300 rounded-lg hover:bg-scada-600 hover:text-white hover:border-scada-500 transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Agregar Sensor
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-3 bg-scada-700 border-2 border-scada-600 text-slate-300 rounded-lg hover:bg-scada-600 hover:text-white hover:border-scada-500 transition-all"
              title="Pantalla Completa"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {currentTab ? (
          isEditing ? (
            <EditView
              tab={currentTab}
              sensors={sensors}
              availableSensors={availableSensors}
              onAddWidget={addWidget}
              onDeleteWidget={deleteWidget}
              showSensorSelector={showSensorSelector}
              setShowSensorSelector={setShowSensorSelector}
            />
          ) : (
            <ReadView tab={currentTab} sensors={sensors} isFullscreen={isFullscreen} />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Selecciona una máquina</p>
          </div>
        )}
      </div>

      {/* Add Tab Modal */}
      {showAddTabModal && (
        <AddTabModal
          machines={machines}
          plcs={plcs}
          currentBoard={currentBoard}
          sensors={sensors}
          onAddTab={addTab}
          onClose={() => {
            setShowAddTabModal(false);
            setSelectedMachineForTab(null);
          }}
        />
      )}
    </div>
  );
};

/**
 * Edit Mode View
 */
const EditView: React.FC<{
  tab: BoardTab;
  sensors: Sensor[];
  availableSensors: Sensor[];
  onAddWidget: (sensorId: number) => void;
  onDeleteWidget: (widgetId: string) => void;
  showSensorSelector: boolean;
  setShowSensorSelector: (show: boolean) => void;
}> = ({
  tab,
  sensors,
  availableSensors,
  onAddWidget,
  onDeleteWidget,
  showSensorSelector,
  setShowSensorSelector,
}) => {
  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden bg-scada-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Configurar: {tab.name}</h2>
        <div className="relative">
          <button
            onClick={() => setShowSensorSelector(!showSensorSelector)}
            className="px-4 py-2 bg-scada-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
          >
            <Plus size={18} />
            Agregar Medidor
          </button>

          {showSensorSelector && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-scada-800 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto border border-scada-700">
              <div className="p-3 space-y-2">
                {availableSensors.length > 0 ? (
                  availableSensors.map((sensor) => (
                    <button
                      key={sensor.id}
                      onClick={() => {
                        onAddWidget(sensor.id);
                        setShowSensorSelector(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-scada-700 rounded border border-scada-700 transition bg-scada-900 text-white"
                    >
                      <p className="text-sm font-medium text-white">{sensor.name}</p>
                      <p className="text-xs text-scada-400">{sensor.type} • {sensor.unit}</p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-scada-400 text-center py-4">
                    Todos agregados
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-scada-800 rounded-lg border-2 border-dashed border-scada-700 overflow-auto p-4">
        {tab.widgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tab.widgets.map((widget) => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                sensors={sensors}
                onDelete={onDeleteWidget}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Plus size={48} className="mx-auto text-scada-700 mb-2" />
              <p className="text-scada-400 mb-4">Sin medidores</p>
              <button
                onClick={() => setShowSensorSelector(true)}
                className="px-4 py-2 bg-scada-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Agregar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-scada-700 rounded-lg border border-scada-600">
        <p className="text-xs text-scada-300 font-medium uppercase mb-2">Consejo</p>
        <p className="text-sm text-scada-200">
          Agrega medidores desde la columna izquierda. Arrastra para reorganizar (próximamente). Los cambios se guardan automáticamente.
        </p>
      </div>
    </div>
  );
};

/**
 * Widget Card for Editor
 */
const WidgetCard: React.FC<{
  widget: BoardWidgetLayout;
  sensors: Sensor[];
  onDelete: (id: string) => void;
}> = ({ widget, sensors, onDelete }) => {
  const sensor = sensors.find((s) => s.code === widget.sensorCode);

  return (
    <div className="bg-scada-800 rounded-lg border-2 border-dashed border-scada-600 p-4 shadow-lg relative group">
      <div className="absolute top-2 left-2 text-scada-700 group-hover:text-scada-500 transition">
        <GripHorizontal size={18} />
      </div>

      <h3 className="text-sm font-semibold mb-2 pl-6 pr-8 text-white">{widget.title}</h3>
      <p className="text-xs text-scada-400 pl-6">
        {sensor ? `${sensor.name} (${sensor.unit})` : 'Unknown'}
      </p>

      <div className="bg-scada-700 rounded p-2 my-3 min-h-12 flex items-center justify-center border border-scada-600">
        <p className="text-xs text-scada-400">{widget.type}</p>
      </div>

      <button
        onClick={() => onDelete(widget.id)}
        className="absolute top-2 right-2 text-red-500 hover:bg-red-900 p-1 rounded opacity-0 group-hover:opacity-100 transition"
      >
        <X size={16} />
      </button>
    </div>
  );
};

/**
 * Read Mode View
 */
const ReadView: React.FC<{ tab: BoardTab; sensors: Sensor[]; isFullscreen: boolean }> = ({ tab, sensors, isFullscreen }) => {
  const [sensorValues, setSensorValues] = useState<Record<string, any>>({});
  const [selectedHistorySensor, setSelectedHistorySensor] = useState<string | null>(null);

  useEffect(() => {
    const update = async () => {
      try {
        const data = await scadaBackendService.getSensorValues(tab.machineCode);
        setSensorValues(data.sensors || {});
      } catch (error) {
        console.error('Error:', error);
      }
    };

    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  const historySensors = tab.widgets.filter((w) => w.type !== 'line_chart');

  return (
    <div className={`${isFullscreen ? '' : 'flex-1'} overflow-auto flex flex-col`}>
      {/* Main Widgets */}
      <div className="flex-1 p-6 overflow-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{tab.machineName}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tab.widgets.filter((w) => w.type !== 'line_chart').map((widget) => {
            const sensorData = sensorValues[widget.sensorCode];
            const value = typeof sensorData === 'object' ? sensorData.value : sensorData || 0;

            return (
              <div key={widget.id}>
                {widget.type === 'gauge' && (
                  <GaugeWidget
                    id={widget.id}
                    title={widget.title}
                    sensorCode={widget.sensorCode}
                    currentValue={Number(value)}
                    unit={widget.unit}
                    min={widget.config?.min || 0}
                    max={widget.config?.max || 100}
                  />
                )}
                {widget.type === 'kpi' && (
                  <KPIWidget
                    id={widget.id}
                    title={widget.title}
                    sensorCode={widget.sensorCode}
                    currentValue={Number(value)}
                    unit={widget.unit}
                  />
                )}
                {widget.type === 'status' && (
                  <StatusWidget
                    id={widget.id}
                    title={widget.title}
                    sensorCode={widget.sensorCode}
                    currentValue={Number(value)}
                    unit={widget.unit}
                  />
                )}
              </div>
            );
          })}
        </div>

        {tab.widgets.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <p className="text-scada-400">Entra en modo edición para agregar widgets</p>
          </div>
        )}
      </div>

      {/* History Section */}
      {historySensors.length > 0 && (
        <div className="border-t border-scada-700 bg-scada-800">
          <div className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">📊 Históricos</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Sensor Selector */}
              <div className="lg:col-span-1">
                <div className="bg-scada-900 rounded-lg border border-scada-700 p-4 h-full overflow-y-auto">
                  <p className="text-sm font-semibold text-white mb-3">Selecciona medidor</p>
                  <div className="space-y-2">
                    {historySensors.map((widget) => (
                      <button
                        key={widget.id}
                        onClick={() => setSelectedHistorySensor(widget.sensorCode)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                          selectedHistorySensor === widget.sensorCode
                            ? 'bg-scada-500 text-white border border-blue-500'
                            : 'bg-scada-900 text-white border border-scada-700 hover:border-scada-600'
                        }`}
                      >
                        <p className="font-medium">{widget.title}</p>
                        <p className="text-xs opacity-75">{widget.unit}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart Area */}
              <div className="lg:col-span-3">
                {selectedHistorySensor ? (
                  <div className="bg-scada-900 rounded-lg border border-scada-700 p-4">
                    <LineChartWidget
                      id={selectedHistorySensor}
                      title={tab.widgets.find((w) => w.sensorCode === selectedHistorySensor)?.title || 'Histórico'}
                      sensorCode={selectedHistorySensor}
                      sensorName={tab.widgets.find((w) => w.sensorCode === selectedHistorySensor)?.sensorName}
                      unit={tab.widgets.find((w) => w.sensorCode === selectedHistorySensor)?.unit}
                      height={250}
                    />
                  </div>
                ) : (
                  <div className="bg-scada-900 rounded-lg border border-scada-700 p-4 h-80 flex items-center justify-center">
                    <p className="text-scada-400">Selecciona un medidor para ver el histórico</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Add Tab Modal - Select machine and view sensors
 */
const AddTabModal: React.FC<{
  machines: Machine[];
  plcs: PLC[];
  currentBoard: Board | null;
  sensors: Sensor[];
  onAddTab: (machineId: number) => void;
  onClose: () => void;
}> = ({ machines, plcs, currentBoard, sensors, onAddTab, onClose }) => {
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  // Helper function to get sensors for a machine
  const getSensorsForMachine = (machineCode: string): Sensor[] => {
    // Filter sensors by machine code - flexible pattern matching
    // For "sec21", look for sensors containing "sec21", "21", or ending with "_21"
    return sensors.filter(sensor => {
      const code = sensor.code.toLowerCase();
      const machine = machineCode.toLowerCase();

      // Direct match
      if (code.includes(machine)) return true;

      // For machines like "sec21", also match "21" patterns
      if (machine.startsWith('sec') && machine.length > 3) {
        const numberPart = machine.substring(3); // "21" from "sec21"
        if (code.includes(`_${numberPart}`) || code.endsWith(`_${numberPart}`)) return true;
      }

      return false;
    });
  };

  const availableMachines = machines.filter(
    (m) => !currentBoard?.tabs.some((t) => t.machineId === m.id)
  );

  const machineSensors = selectedMachine
    ? getSensorsForMachine(selectedMachine.code)
    : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-scada-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 flex flex-col border border-scada-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-scada-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Agregar Máquina</h2>
          <button
            onClick={onClose}
            className="text-scada-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex">
          {/* Machines List */}
          <div className="w-64 border-r border-scada-700 flex flex-col">
            <div className="px-4 py-3 bg-scada-900 border-b border-scada-700">
              <p className="text-sm font-semibold text-white">
                Máquinas ({availableMachines.length})
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {availableMachines.length > 0 ? (
                availableMachines.map((machine) => (
                  <button
                    key={machine.id}
                    onClick={() => setSelectedMachine(machine)}
                    className={`w-full text-left px-4 py-3 border-b border-scada-700 hover:bg-scada-700 transition ${
                      selectedMachine?.id === machine.id ? 'bg-scada-500' : ''
                    }`}
                  >
                    <p className="font-medium text-sm text-white">{machine.name}</p>
                    <p className="text-xs text-scada-400">{machine.code}</p>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-scada-400 text-sm">
                  Todas agregadas
                </div>
              )}
            </div>
          </div>

          {/* Sensors Preview */}
          <div className="flex-1 flex flex-col">
            {selectedMachine ? (
              <>
                <div className="px-6 py-4 bg-scada-700 border-b border-scada-600">
                  <p className="text-sm font-semibold text-white mb-1">
                    {selectedMachine.name}
                  </p>
                  <p className="text-xs text-scada-300">
                    {machineSensors.length} medidor{machineSensors.length !== 1 ? 'es' : ''}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {machineSensors.length > 0 ? (
                    <div className="space-y-2">
                      {machineSensors.map((sensor) => (
                        <div
                          key={sensor.id}
                          className="p-3 bg-scada-900 rounded border border-scada-700 hover:bg-scada-800 transition"
                        >
                          <p className="text-sm font-medium text-white">
                            {sensor.name}
                          </p>
                          <p className="text-xs text-scada-400">
                            {sensor.type} • {sensor.unit}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-scada-400">
                      <p className="text-sm">Sin medidores configurados</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-scada-400">
                <p className="text-sm">Selecciona una máquina</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-scada-900 border-t border-scada-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-scada-300 bg-scada-700 rounded-lg hover:bg-scada-600 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (selectedMachine) {
                onAddTab(selectedMachine.id);
                onClose();
              }
            }}
            disabled={!selectedMachine}
            className="px-4 py-2 bg-scada-500 text-white rounded-lg hover:bg-blue-600 transition disabled:bg-scada-700 disabled:text-scada-400 disabled:cursor-not-allowed"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
};
