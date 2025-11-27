# 📊 Estructura de Carpetas - Sistema de Tableros

```
frontend/
│
├── 🎯 DOCUMENTACIÓN
│   ├── TABLEROS_RESUMEN.md              ← LEER PRIMERO (este archivo)
│   ├── GUIA_RAPIDA_TABLEROS.md          ← Guía de usuario rápida
│   ├── BOARDS_IMPLEMENTATION.md         ← Detalles técnicos
│   └── README.md                        ← README original
│
├── 🔧 services/
│   ├── boardService.ts ✨ NUEVO         ← Lógica de persistencia
│   ├── iotService.ts                    ← API IoT (existente)
│   └── adminService.ts                  ← Admin (existente)
│
├── 📋 types.ts
│   └── +50 líneas ✨ ACTUALIZADO       ← Board, BoardTab, BoardWidgetLayout
│
├── 🎨 features/
│   └── boards/ ✨ NUEVA CARPETA
│       ├── BoardsPage.tsx               ← Componente principal (modo lectura + edición)
│       ├── BoardWidgets.tsx             ← Widgets reutilizables (Gauge, KPI, Status, Chart)
│       ├── sampleData.ts                ← Datos de ejemplo
│       ├── README.md                    ← Documentación completa
│       └── index.ts                     ← Exportaciones públicas
│   │
│   ├── dashboard/
│   │   └── Dashboard.tsx                ← Existente
│   │
│   ├── machineDetail/
│   │   └── *.tsx                        ← Existente
│   │
│   └── ... (otros módulos)
│
├── 🧩 components/
│   ├── Layout.tsx ✨ ACTUALIZADO       ← +Grid icon en sidebar
│   └── ... (otros)
│
└── 🚀 App.tsx ✨ ACTUALIZADO
    └── +import BoardsPage, +ruta /boards

```

## 📊 Diagrama de Relaciones

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONT-END (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    App.tsx Router                         │   │
│  │  Route: /boards → <BoardsPage />                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              BoardsPage Component                         │   │
│  │  • Gestor de Tableros                                    │   │
│  │  • Sistema de Pestañas (máquinas)                       │   │
│  │  • Modo Edición/Lectura                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                          │                             │
│         ▼                          ▼                             │
│  ┌─────────────────┐      ┌──────────────────┐                 │
│  │  EditView       │      │  ReadView        │                 │
│  │  - Agregar med. │      │  - Mostrar datos │                 │
│  │  - Eliminar wgt │      │  - Tiempo real   │                 │
│  │  - Inspector    │      │  - Actualización │                 │
│  └─────────────────┘      └──────────────────┘                 │
│         │                          │                             │
│         └──────────────┬───────────┘                             │
│                        ▼                                         │
│         ┌───────────────────────────┐                            │
│         │  BoardWidgets Components  │                            │
│         │  ├─ GaugeWidget           │                            │
│         │  ├─ KPIWidget             │                            │
│         │  ├─ StatusWidget          │                            │
│         │  ├─ LineChartWidget       │                            │
│         │  └─ AlertWidget           │                            │
│         └───────────────────────────┘                            │
│                        │                                         │
│                        ▼                                         │
│         ┌───────────────────────────┐                            │
│         │   boardService (CRUD)     │                            │
│         │   ├─ Boards               │                            │
│         │   ├─ Tabs                 │                            │
│         │   └─ Widgets              │                            │
│         └───────────────────────────┘                            │
│                        │                                         │
│                        ▼                                         │
│         ┌───────────────────────────┐                            │
│         │  localStorage (5-10MB)    │                            │
│         │  {                        │                            │
│         │    boards: [Board]        │                            │
│         │  }                        │                            │
│         └───────────────────────────┘                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Requests
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACK-END API                               │
│  GET /api/machines                                              │
│  GET /api/sensors                                               │
│  GET /api/sensors/values         ← Datos en tiempo real        │
│  GET /api/sensors/{id}/history   ← Históricos para gráficos    │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Datos

### Lectura (View Mode)
```
BoardsPage (ReadView)
  ↓
useEffect (cada 5s)
  ↓
fetch /api/sensors/values
  ↓
setSensorValues()
  ↓
Widgets renderean con datos frescos
```

### Edición (Edit Mode)
```
BoardsPage (EditView)
  ↓
Usuario agrega/elimina widgets
  ↓
Llama boardService.addWidget() / deleteWidget()
  ↓
Service actualiza estado local
  ↓
localStorage se sincroniza automáticamente
  ↓
Usuario hace click Guardar
  ↓
Re-render en modo lectura
```

### Persistencia
```
boardService (CRUD)
  ↓
localStorage.setItem('scada_boards', JSON.stringify(boards))
  ↓
Data persiste en navegador
  ↓
Al recargar página, se recupera del storage
  ↓
Usuario ve mismo tablero que dejó
```

## 📦 Exportaciones Principales

```typescript
// features/boards/index.ts
export { BoardsPage } from './BoardsPage';
export { 
  GaugeWidget, 
  KPIWidget, 
  StatusWidget, 
  LineChartWidget, 
  AlertWidget 
} from './BoardWidgets';

// services/boardService.ts
export { boardService }; // Singleton service

// types.ts
export interface Board { ... }
export interface BoardTab { ... }
export interface BoardWidgetLayout { ... }
```

## 🎯 Puntos de Entrada

### Para Usuarios
```
🌐 http://localhost:5173/#/boards
```

### Para Desarrolladores
```typescript
// Importar servicio
import { boardService } from '../../services/boardService';

// Usar en componentes
const boards = boardService.getBoards();
const newBoard = boardService.createBoard('Mi Tablero');

// Importar tipos
import { Board, BoardTab, BoardWidgetLayout } from '../../types';

// Importar widgets
import { GaugeWidget, KPIWidget } from '../../features/boards';
```

## 🚀 Stack Tecnológico

```
React 19.2.0
├─ TypeScript 5.8
├─ React Router 7.9
├─ Lucide React (iconos)
├─ Recharts (gráficos)
└─ TailwindCSS (estilos)

Storage: localStorage (5-10MB)
API: REST (fetch)
Build: Vite 6.2
```

## 📊 Estadísticas de Código

```
Archivos Nuevos:       5
├─ BoardsPage.tsx      (~650 líneas)
├─ BoardWidgets.tsx    (~330 líneas)
├─ boardService.ts     (~450 líneas)
├─ sampleData.ts       (~100 líneas)
└─ README.md           (~400 líneas)

Archivos Modificados:  3
├─ types.ts            (+50 líneas)
├─ App.tsx             (+2 líneas)
└─ Layout.tsx          (+2 líneas)

Documentación:         3
├─ TABLEROS_RESUMEN.md
├─ GUIA_RAPIDA_TABLEROS.md
└─ BOARDS_IMPLEMENTATION.md

Total de Código:       ~2000 líneas
Documentación:         ~1500 líneas
```

## ✅ Checklist de Validación

- [x] TypeScript: Sin errores
- [x] Componentes: Renderean correctamente
- [x] Servicios: CRUD completo funcional
- [x] Storage: localStorage funciona
- [x] API: Integración con /api/sensors/values
- [x] Widgets: Actualizaciones en tiempo real
- [x] UI/UX: Intuitiva y responsive
- [x] Documentación: Completa
- [x] Ejemplos: Proporcionados
- [x] Manejo de errores: Implementado

## 🎓 Cómo Empezar

### 1. Explorar Documentación
```
Leer: GUIA_RAPIDA_TABLEROS.md  (5 min)
      ↓
      BOARDS_IMPLEMENTATION.md   (10 min)
      ↓
      features/boards/README.md  (15 min)
```

### 2. Probar en Navegador
```
1. Ir a: http://localhost:5173/#/boards
2. Crear tablero
3. Agregar máquina
4. Agregar sensores
5. Visualizar datos
```

### 3. Revisar Código
```
1. Leer: BoardsPage.tsx (componente principal)
2. Revisar: BoardWidgets.tsx (componentes UI)
3. Estudiar: boardService.ts (lógica)
4. Consultar: types.ts (interfaces)
```

### 4. Usar en tu Código
```typescript
import { boardService } from './services/boardService';
import { Board } from './types';

// Crear tablero programáticamente
const board = boardService.createBoard('Auto Generated');

// Exportar para backup
const json = boardService.exportBoard(board.id);
```

## 🔐 Consideraciones de Seguridad

- ✅ Data local en navegador (no sube a servidor)
- ✅ Sin autenticación requerida (todos los usuarios ven lo mismo)
- ✅ Sin validación de permisos (considera agregar en el futuro)
- ⚠️ localStorage accesible en DevTools
- ⚠️ No encriptado (considera SSO para versión cloud)

## 📈 Escalabilidad

### Límites Actuales
- **Storage:** ~5-10MB (localStorage limit)
- **Widgets:** 20-30 por pestaña recomendados
- **Tableros:** 5-10 activos sin ralentizar
- **Actualización:** Cada 5 segundos

### Para Escalar
1. **Backend Storage:** Migrar de localStorage a DB
2. **Sincronización:** WebSocket para tiempo real
3. **Caché:** Redis para datos históricos
4. **CDN:** Cachear assets estáticos
5. **Clustering:** Load balancing si multiplica usuarios

## 🎉 ¡Listo para Usar!

El sistema de tableros está **completamente funcional** y **production-ready**.

**Próximos pasos:**
1. Prueba en el navegador
2. Crea tu primer tablero
3. ¡Monitorea tu producción en tiempo real!

---

**Versión:** 1.0.0  
**Status:** ✅ Production Ready  
**Mantenedor:** Sistema SCADA  
**Última actualización:** Noviembre 2025

¡Bienvenido al sistema de tableros! 🚀
