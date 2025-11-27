# Sistema de Tableros (Boards)

## Descripción General

El sistema de Tableros proporciona una solución completa para crear, gestionar y personalizar dashboards interactivos en la aplicación SCADA. Permite a los usuarios:

- ✅ Crear múltiples tableros independientes
- ✅ Organizar máquinas en pestañas dentro de cada tablero
- ✅ Agregar medidores/sensores como widgets
- ✅ Visualizar datos en tiempo real con múltiples tipos de widgets
- ✅ Editar y reorganizar widgets
- ✅ Guardar configuraciones automáticamente
- ✅ Exportar/Importar tableros en formato JSON

## Arquitectura

### Componentes Principales

```
features/boards/
├── BoardsPage.tsx           # Componente principal (contenedor)
├── BoardWidgets.tsx         # Componentes de widgets reutilizables
├── index.ts                 # Exportaciones públicas
└── README.md               # Este archivo

services/
└── boardService.ts          # Servicio de persistencia y lógica de negocio

types.ts                      # Interfaces TypeScript
```

## Tipos de Datos

### Board
Representa un tablero completo que contiene múltiples pestañas.

```typescript
interface Board {
  id: string;
  name: string;
  description?: string;
  tabs: BoardTab[];
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}
```

### BoardTab
Representa una pestaña dentro de un tablero, típicamente asociada a una máquina.

```typescript
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
```

### BoardWidgetLayout
Define la configuración de un widget individual.

```typescript
interface BoardWidgetLayout {
  id: string;
  type: 'gauge' | 'line_chart' | 'kpi' | 'status' | 'alarm' | 'digital_io';
  title: string;
  sensorCode: string;
  sensorName?: string;
  unit?: string;
  machineId: number;
  machineCode?: string;
  
  // Grid position
  x: number;
  y: number;
  w: number;
  h: number;
  
  // Configuration
  config?: {
    min?: number;
    max?: number;
    thresholds?: Array<{ value: number; color: string }>;
    timeRange?: '1h' | '24h' | '7d' | '30d';
    refreshInterval?: number;
    [key: string]: any;
  };
}
```

## Tipos de Widgets

### 1. Gauge (Medidor)
Visualiza un valor en un rango con indicador visual circular.

**Ideal para:**
- Temperaturas
- Presiones
- Velocidades
- Porcentajes

**Propiedades de configuración:**
- `min`: Valor mínimo del rango
- `max`: Valor máximo del rango
- `threshold`: Valor de alerta (opcional)

**Ejemplo:**
```
Temperatura: 65°C
Rango: 0-100°C
```

### 2. KPI (Key Performance Indicator)
Muestra un indicador clave con su tendencia.

**Ideal para:**
- Eficiencia de producción
- Disponibilidad
- Calidad
- Rendimiento

**Propiedades de configuración:**
- `trend`: 'up' | 'down' | 'stable'

**Ejemplo:**
```
Disponibilidad: 89.3%
Tendencia: ↑
```

### 3. Status (Estado)
Indicador ON/OFF o estado booleano.

**Ideal para:**
- Estados de máquinas
- Alarmas
- Switches digitales

**Ejemplo:**
```
ACTIVO / INACTIVO
ON / OFF
```

### 4. Line Chart (Gráfico)
Visualiza datos históricos en un gráfico de líneas.

**Ideal para:**
- Tendencias temporales
- Historiales
- Comparativas

**Propiedades de configuración:**
- `timeRange`: '1h' | '24h' | '7d' | '30d'
- `refreshInterval`: Intervalo de actualización en ms

## Servicios (BoardService)

El servicio `boardService` proporciona CRUD completo para tableros:

### Métodos Principales

#### Tableros
```typescript
// Obtener todos los tableros
getBoards(): Board[]

// Obtener un tablero específico
getBoard(boardId: string): Board | null

// Crear nuevo tablero
createBoard(name: string, description?: string): Board

// Actualizar tablero
updateBoard(boardId: string, updates: Partial<Board>): Board | null

// Eliminar tablero
deleteBoard(boardId: string): boolean

// Gestionar tablero por defecto
getDefaultBoard(): Board | null
setDefaultBoard(boardId: string): void
```

#### Pestañas
```typescript
// Agregar pestaña a un tablero
addTab(boardId: string, machineId: number, machineCode: string, machineName: string): BoardTab | null

// Obtener pestaña
getTab(boardId: string, tabId: string): BoardTab | null

// Actualizar pestaña
updateTab(boardId: string, tabId: string, updates: Partial<BoardTab>): BoardTab | null

// Eliminar pestaña
deleteTab(boardId: string, tabId: string): boolean
```

#### Widgets
```typescript
// Agregar widget
addWidget(boardId: string, tabId: string, widget: Omit<BoardWidgetLayout, 'id'>): BoardWidgetLayout | null

// Obtener widget
getWidget(boardId: string, tabId: string, widgetId: string): BoardWidgetLayout | null

// Actualizar widget
updateWidget(boardId: string, tabId: string, widgetId: string, updates: Partial<BoardWidgetLayout>): BoardWidgetLayout | null

// Actualizar múltiples widgets (para drag & drop)
updateWidgets(boardId: string, tabId: string, widgetUpdates: Array<{ id: string; updates: Partial<BoardWidgetLayout> }>): boolean

// Eliminar widget
deleteWidget(boardId: string, tabId: string, widgetId: string): boolean

// Eliminar todos los widgets de una pestaña
deleteAllWidgets(boardId: string, tabId: string): boolean
```

#### Importar/Exportar
```typescript
// Exportar tablero como JSON
exportBoard(boardId: string): string | null

// Importar tablero desde JSON
importBoard(jsonStr: string): Board | null
```

## Almacenamiento

Los tableros se almacenan en **localStorage** bajo la clave `scada_boards`. Esto permite:

- ✅ Persistencia local sin servidor
- ✅ Rápido acceso
- ✅ Funcionalidad offline
- ✅ Sincronización automática

**Límites:**
- Máximo ~5-10MB de datos
- Para aplicaciones grandes, considerar sincronización con backend

## Uso en la Aplicación

### Acceso a la página
```
http://localhost:5173/#/boards
```

### Navegación
1. **Selector de Tableros** - Dropdown en la esquina superior derecha
2. **Pestañas de Máquinas** - Seleccionar máquina a visualizar
3. **Modo Edición** - Botón "Editar" para personalizar

### Workflow Típico

1. **Crear Tablero**
   - Click en "Tableros"
   - Ingresar nombre
   - Click "Crear"

2. **Agregar Máquina**
   - Click en "Agregar máquina" (en modo edición)
   - Seleccionar máquina de la lista

3. **Agregar Widgets**
   - Click en "Agregar Medidor"
   - Seleccionar sensor de la lista

4. **Visualizar**
   - Click "Guardar" para salir del modo edición
   - Los datos se actualizan cada 5 segundos

5. **Exportar/Importar**
   - Usar opciones en el menú "Tableros"
   - Compartir tableros en formato JSON

## Ejemplos de Uso

### Crear un tablero para monitoreo de temperatura

```typescript
// 1. Crear tablero
const board = boardService.createBoard('Monitoreo Temperatura');

// 2. Agregar pestaña para máquina
const tab = boardService.addTab(board.id, machineId, 'MACH001', 'Máquina Enfriamiento');

// 3. Agregar widgets para sensores de temperatura
const sensor1 = sensors.find(s => s.code === 'TEMP_SEC21');
if (sensor1) {
  boardService.addWidget(board.id, tab.id, {
    type: 'gauge',
    title: 'Temperatura Sección 21',
    sensorCode: sensor1.code,
    sensorName: sensor1.name,
    unit: '°C',
    machineId: machineId,
    machineCode: 'MACH001',
    x: 0, y: 0, w: 1, h: 1,
    config: {
      min: 0,
      max: 100,
      threshold: 85
    }
  });
}
```

### Exportar tablero para compartir

```typescript
const json = boardService.exportBoard(boardId);
// Guardar como archivo JSON
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'tablero-produccion.json';
a.click();
```

## Mejoras Futuras

- [ ] Drag & Drop mejorado con react-grid-layout
- [ ] Más tipos de widgets (histogramas, KPIs complejos)
- [ ] Sincronización con backend
- [ ] Compartir tableros entre usuarios
- [ ] Temas personalizados
- [ ] Alertas y notificaciones integradas
- [ ] Autorefresh configurable por widget
- [ ] Widgets en fullscreen

## Troubleshooting

### "No hay tableros disponibles"
- Solución: Crear un nuevo tablero

### Los widgets no muestran datos
- Verificar que los sensores estén activos
- Revisar que el código del sensor sea correcto
- Comprobar conexión con API en `/api/sensors/values`

### Los cambios no se guardan
- localStorage podría estar lleno
- Limpiar datos del navegador
- Exportar/Importar tableros

### Rendimiento lento con muchos widgets
- Reducir número de widgets por pestaña
- Aumentar intervalo de refresco
- Usar widgets más simples

## Referencias

- [types.ts](../../types.ts) - Definiciones de tipos
- [boardService.ts](../../services/boardService.ts) - Lógica de persistencia
- [BoardWidgets.tsx](./BoardWidgets.tsx) - Componentes de widgets
