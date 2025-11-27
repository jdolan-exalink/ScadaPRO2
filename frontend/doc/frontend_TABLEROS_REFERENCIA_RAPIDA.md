#!/usr/bin/env node
/**
 * REFERENCIA RÁPIDA - Sistema de Tableros
 * Copypaste para las operaciones más comunes
 */

// ============================================
// 1. IMPORTAR EN TUS COMPONENTES
// ============================================

import { boardService } from '../../services/boardService';
import { Board, BoardTab, BoardWidgetLayout } from '../../types';
import { GaugeWidget, KPIWidget, StatusWidget } from '../../features/boards';


// ============================================
// 2. OPERACIONES BÁSICAS CON TABLEROS
// ============================================

// Obtener todos los tableros
const boards = boardService.getBoards();

// Crear nuevo tablero
const newBoard = boardService.createBoard(
  'Mi Tablero',
  'Descripción opcional'
);

// Obtener tablero específico
const board = boardService.getBoard('board-id');

// Actualizar tablero
const updated = boardService.updateBoard('board-id', {
  name: 'Nuevo nombre',
  description: 'Nueva descripción'
});

// Eliminar tablero
boardService.deleteBoard('board-id');

// Marcar como favorito (se abre por defecto)
boardService.setDefaultBoard('board-id');


// ============================================
// 3. OPERACIONES CON PESTAÑAS
// ============================================

// Agregar pestaña (máquina)
const newTab = boardService.addTab(
  'board-id',
  machineId,      // number
  'MACH001',      // code
  'Máquina 1'     // name
);

// Obtener pestaña
const tab = boardService.getTab('board-id', 'tab-id');

// Cambiar pestaña activa
boardService.updateTab('board-id', 'tab-id', {
  isActive: true
});

// Eliminar pestaña
boardService.deleteTab('board-id', 'tab-id');


// ============================================
// 4. OPERACIONES CON WIDGETS
// ============================================

// Agregar widget (sensor)
const widget = boardService.addWidget(
  'board-id',
  'tab-id',
  {
    type: 'gauge',
    title: 'Temperatura',
    sensorCode: 'temp_sec21',
    sensorName: 'Temperatura Sección 21',
    unit: '°C',
    machineId: 1,
    machineCode: 'SEC21',
    x: 0, y: 0,    // Posición en grid
    w: 1, h: 1,    // Tamaño en grid
    config: {
      min: 0,
      max: 100,
      threshold: 85
    }
  }
);

// Obtener widget
const widget = boardService.getWidget(
  'board-id',
  'tab-id',
  'widget-id'
);

// Actualizar widget
boardService.updateWidget(
  'board-id',
  'tab-id',
  'widget-id',
  {
    type: 'kpi',
    config: { min: 0, max: 200 }
  }
);

// Actualizar múltiples widgets (para drag & drop)
boardService.updateWidgets(
  'board-id',
  'tab-id',
  [
    {
      id: 'widget-1',
      updates: { x: 1, y: 0 }
    },
    {
      id: 'widget-2',
      updates: { x: 0, y: 1 }
    }
  ]
);

// Eliminar widget
boardService.deleteWidget('board-id', 'tab-id', 'widget-id');

// Eliminar todos los widgets de una pestaña
boardService.deleteAllWidgets('board-id', 'tab-id');

// Obtener todos los widgets de una pestaña
const widgets = boardService.getTabWidgets('board-id', 'tab-id');


// ============================================
// 5. IMPORTAR Y EXPORTAR
// ============================================

// Exportar tablero como JSON
const json = boardService.exportBoard('board-id');
// → string JSON completo

// Importar tablero desde JSON
const imported = boardService.importBoard(jsonString);
// → Board nuevo con IDs regenerados


// ============================================
// 6. USAR EN UN COMPONENTE REACT
// ============================================

import React, { useEffect, useState } from 'react';

export const MyComponent: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);

  useEffect(() => {
    // Cargar tableros
    const loaded = boardService.getBoards();
    setBoards(loaded);
    
    // Obtener tablero por defecto
    const defaultBoard = boardService.getDefaultBoard();
    setCurrentBoard(defaultBoard);
  }, []);

  const handleCreateBoard = (name: string) => {
    const newBoard = boardService.createBoard(name);
    setBoards([...boards, newBoard]);
    setCurrentBoard(newBoard);
    boardService.setDefaultBoard(newBoard.id);
  };

  return (
    <div>
      <h1>{currentBoard?.name}</h1>
      {/* Tu UI aquí */}
    </div>
  );
};


// ============================================
// 7. TIPOS DE WIDGETS
// ============================================

// Gauge (Medidor circular)
const gauge: BoardWidgetLayout = {
  id: 'w1',
  type: 'gauge',
  title: 'Temperatura',
  sensorCode: 'temp1',
  unit: '°C',
  machineId: 1,
  x: 0, y: 0, w: 1, h: 1,
  config: {
    min: 0,
    max: 100,
    threshold: 85
  }
};

// KPI (Indicador con tendencia)
const kpi: BoardWidgetLayout = {
  id: 'w2',
  type: 'kpi',
  title: 'Eficiencia',
  sensorCode: 'efficiency1',
  unit: '%',
  machineId: 1,
  x: 1, y: 0, w: 1, h: 1
};

// Status (ON/OFF)
const status: BoardWidgetLayout = {
  id: 'w3',
  type: 'status',
  title: 'Motor',
  sensorCode: 'motor_status',
  unit: 'Estado',
  machineId: 1,
  x: 2, y: 0, w: 1, h: 1
};

// Line Chart (Histórico)
const chart: BoardWidgetLayout = {
  id: 'w4',
  type: 'line_chart',
  title: 'Historial 24h',
  sensorCode: 'temp_history',
  unit: '°C',
  machineId: 1,
  x: 0, y: 1, w: 3, h: 2,
  config: {
    timeRange: '24h',
    refreshInterval: 60000
  }
};


// ============================================
// 8. ESTRUCTURA DE DATOS
// ============================================

// Board completo
const board: Board = {
  id: 'board-123',
  name: 'Producción',
  description: 'Panel principal',
  tabs: [],
  createdAt: '2025-11-26T00:00:00Z',
  updatedAt: '2025-11-26T00:00:00Z',
  isDefault: true
};

// BoardTab
const tab: BoardTab = {
  id: 'tab-123',
  name: 'Sección 21',
  machineId: 1,
  machineCode: 'SEC21',
  machineName: 'Sección 21 - Enfriamiento',
  widgets: [],
  order: 1,
  isActive: true
};

// BoardWidgetLayout
const widget: BoardWidgetLayout = {
  id: 'widget-123',
  type: 'gauge',
  title: 'Temperatura',
  sensorCode: 'temp_sec21',
  sensorName: 'Temperatura Medida',
  unit: '°C',
  machineId: 1,
  machineCode: 'SEC21',
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  config: {
    min: 0,
    max: 100,
    threshold: 85
  }
};


// ============================================
// 9. CASOS DE USO COMUNES
// ============================================

// Crear tablero con máquina y sensores
async function createProductionDashboard(
  machineName: string,
  sensors: Sensor[]
) {
  // 1. Crear tablero
  const board = boardService.createBoard('Production Dashboard');
  
  // 2. Agregar máquina
  const tab = boardService.addTab(
    board.id,
    1,
    'PROD1',
    machineName
  );

  if (!tab) return null;

  // 3. Agregar sensores
  sensors.forEach((sensor, index) => {
    boardService.addWidget(board.id, tab.id, {
      type: sensor.type.includes('temp') ? 'gauge' : 'status',
      title: sensor.name,
      sensorCode: sensor.code,
      sensorName: sensor.name,
      unit: sensor.unit,
      machineId: 1,
      machineCode: 'PROD1',
      x: index % 4,
      y: Math.floor(index / 4),
      w: 1,
      h: 1,
      config: {
        min: 0,
        max: 100
      }
    });
  });

  return board;
}

// Exportar y descargar tablero
function downloadBoard(boardId: string) {
  const json = boardService.exportBoard(boardId);
  if (!json) return;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `board-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Importar desde archivo
function uploadBoard(file: File) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const json = event.target?.result as string;
      const imported = boardService.importBoard(json);
      if (imported) {
        alert(`Tablero "${imported.name}" importado exitosamente!`);
      }
    } catch (error) {
      alert('Error al importar tablero');
      console.error(error);
    }
  };
  reader.readAsText(file);
}


// ============================================
// 10. DEBUGGING
// ============================================

// Ver todos los tableros en consola
console.log(boardService.getBoards());

// Ver tabla de todos los tableros
console.table(boardService.getBoards());

// Ver tablero específico con detalles
const board = boardService.getBoard('board-id');
console.log('Tablero:', board?.name);
console.log('Pestañas:', board?.tabs.length);
console.log('Widgets totales:', 
  board?.tabs.reduce((sum, t) => sum + t.widgets.length, 0)
);

// Exportar para análisis
const json = boardService.exportBoard('board-id');
console.log(JSON.parse(json || '{}'));


// ============================================
// 11. LINKS ÚTILES
// ============================================

/**
 * Documentación:
 * - GUIA_RAPIDA_TABLEROS.md      Guía para usuarios
 * - TABLEROS_RESUMEN.md          Overview técnico
 * - TABLEROS_ESTRUCTURA.md       Arquitectura
 * - features/boards/README.md    Documentación completa
 * 
 * Código:
 * - services/boardService.ts     Servicio CRUD
 * - features/boards/BoardsPage.tsx    Componente principal
 * - features/boards/BoardWidgets.tsx  Componentes UI
 * - types.ts                     Interfaces TypeScript
 * 
 * URLs:
 * - http://localhost:5173/#/boards    Acceso a tableros
 * - http://localhost:5173/docs        API documentation
 */


// ============================================
// 12. TIPOS TYPESCRIPT
// ============================================

interface Board {
  id: string;
  name: string;
  description?: string;
  tabs: BoardTab[];
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

interface BoardTab {
  id: string;
  name: string;
  machineId: number;
  machineCode: string;
  machineName: string;
  widgets: BoardWidgetLayout[];
  order: number;
  isActive?: boolean;
}

interface BoardWidgetLayout {
  id: string;
  type: 'gauge' | 'line_chart' | 'kpi' | 'status' | 'alarm' | 'digital_io';
  title: string;
  sensorCode: string;
  sensorName?: string;
  unit?: string;
  machineId: number;
  machineCode?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: {
    min?: number;
    max?: number;
    thresholds?: Array<{ value: number; color: string }>;
    timeRange?: '1h' | '24h' | '7d' | '30d';
    refreshInterval?: number;
    [key: string]: any;
  };
}


// ============================================
// RESUMEN RÁPIDO
// ============================================

/*
CREAR:
  boardService.createBoard(name)
  boardService.addTab(boardId, machineId, code, name)
  boardService.addWidget(boardId, tabId, widget)

LEER:
  boardService.getBoards()
  boardService.getBoard(id)
  boardService.getTab(boardId, tabId)
  boardService.getTabWidgets(boardId, tabId)

ACTUALIZAR:
  boardService.updateBoard(id, updates)
  boardService.updateTab(boardId, tabId, updates)
  boardService.updateWidget(boardId, tabId, widgetId, updates)

ELIMINAR:
  boardService.deleteBoard(id)
  boardService.deleteTab(boardId, tabId)
  boardService.deleteWidget(boardId, tabId, widgetId)

PERSISTENCIA:
  boardService.exportBoard(id)        // → JSON string
  boardService.importBoard(json)      // → Board object

FAVORITOS:
  boardService.setDefaultBoard(id)
  boardService.getDefaultBoard()

TODO RÁPIDO EN 30 SEGUNDOS:
  1. const boards = boardService.getBoards()
  2. const board = boardService.createBoard('Mi Tablero')
  3. const tab = boardService.addTab(board.id, 1, 'M1', 'Máquina')
  4. boardService.addWidget(board.id, tab.id, widget)
  5. const json = boardService.exportBoard(board.id)
*/
