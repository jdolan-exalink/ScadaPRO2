# 🏗️ ScadaPRO2 v0.2.0 - Architecture Documentation

Complete architectural overview of the ScadaPRO2 v0.2.0 system including all components, data flows, and dependency relationships.

## 📚 Documentation Structure

This directory contains comprehensive architectural documentation organized by topic:

### Core Architecture
- **[01-SYSTEM_OVERVIEW.md](./01-SYSTEM_OVERVIEW.md)** - High-level system architecture and components
- **[02-DATA_FLOW.md](./02-DATA_FLOW.md)** - Data flow diagrams and sequence flows
- **[03-COMPONENT_ARCHITECTURE.md](./03-COMPONENT_ARCHITECTURE.md)** - Detailed component structure

### Frontend Architecture
- **[04-FRONTEND_ARCHITECTURE.md](./04-FRONTEND_ARCHITECTURE.md)** - React application structure
- **[05-SERVICE_LAYER.md](./05-SERVICE_LAYER.md)** - Frontend service abstraction layer
- **[06-STATE_MANAGEMENT.md](./06-STATE_MANAGEMENT.md)** - State management and data flow

### Backend Architecture
- **[07-BACKEND_API.md](./07-BACKEND_API.md)** - FastAPI server structure
- **[08-DATABASE_SCHEMA.md](./08-DATABASE_SCHEMA.md)** - Database design and relationships
- **[09-MQTT_INTEGRATION.md](./09-MQTT_INTEGRATION.md)** - Real-time messaging system

### Integration & Deployment
- **[10-INTEGRATION_PATTERNS.md](./10-INTEGRATION_PATTERNS.md)** - Frontend-Backend integration
- **[11-DOCKER_ARCHITECTURE.md](./11-DOCKER_ARCHITECTURE.md)** - Container orchestration
- **[12-DEPLOYMENT_TOPOLOGY.md](./12-DEPLOYMENT_TOPOLOGY.md)** - Production deployment

---

## 🎯 Quick Start by Role

### 👨‍💻 **For Frontend Developers**
1. Start with [04-FRONTEND_ARCHITECTURE.md](./04-FRONTEND_ARCHITECTURE.md)
2. Review [05-SERVICE_LAYER.md](./05-SERVICE_LAYER.md) for API communication
3. Understand [06-STATE_MANAGEMENT.md](./06-STATE_MANAGEMENT.md)

### 🔧 **For Backend Developers**
1. Start with [07-BACKEND_API.md](./07-BACKEND_API.md)
2. Review [08-DATABASE_SCHEMA.md](./08-DATABASE_SCHEMA.md)
3. Study [09-MQTT_INTEGRATION.md](./09-MQTT_INTEGRATION.md)

### 🚀 **For DevOps/Deployment Engineers**
1. Start with [01-SYSTEM_OVERVIEW.md](./01-SYSTEM_OVERVIEW.md)
2. Review [11-DOCKER_ARCHITECTURE.md](./11-DOCKER_ARCHITECTURE.md)
3. Study [12-DEPLOYMENT_TOPOLOGY.md](./12-DEPLOYMENT_TOPOLOGY.md)

### 🏗️ **For System Architects**
1. Start with [01-SYSTEM_OVERVIEW.md](./01-SYSTEM_OVERVIEW.md)
2. Review [02-DATA_FLOW.md](./02-DATA_FLOW.md)
3. Study [03-COMPONENT_ARCHITECTURE.md](./03-COMPONENT_ARCHITECTURE.md)

---

## 🔍 Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCADA Pro v0.1.0 System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐        ┌──────────────────────┐      │
│  │   Frontend (React)   │        │  Backend (FastAPI)   │      │
│  │                      │        │                      │      │
│  │  - Boards & Widgets  │◄─────►│  - REST API          │      │
│  │  - Alarms Center     │  HTTP │  - WebSocket (RT)    │      │
│  │  - Real-time UI      │        │  - Machine Config    │      │
│  │  - User Dashboards   │        │  - Sensor History    │      │
│  │                      │        │  - Alarm Management  │      │
│  │  Port: 80/443        │        │  Port: 8000          │      │
│  └──────────────────────┘        └──────────────────────┘      │
│         ▲                               ▲                       │
│         │                               │                       │
│         │                        ┌──────┴───────┐               │
│         │                        │              │               │
│         │              ┌─────────▼──┐  ┌────────▼──────┐       │
│         │              │ PostgreSQL  │  │  Mosquitto   │       │
│         │              │ (Data)      │  │  (MQTT)      │       │
│         │              │ Port: 5432  │  │  Port: 1883  │       │
│         │              └─────────────┘  └─────────────┘       │
│         │                                                      │
│         └──────────────── via WebSocket ──────────────────     │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

#### ✅ **Cleanliness: No Legacy Code**
- ✅ Removed embedded Node.js backend from frontend
- ✅ Removed legacy docker-compose files
- ✅ Removed deprecated `iotService.ts` and `mqttService.ts`
- ✅ Single service layer: `scadaBackendService.ts`
- ✅ All components use unified backend interface

#### ✅ **Clear Separation of Concerns**
- **Frontend**: React UI, state management, local persistence
- **Backend**: API, database operations, business logic
- **Real-time**: MQTT for sensor data streaming
- **Data Layer**: PostgreSQL for persistence

#### ✅ **Unified API Layer**
```typescript
// Single point of contact for all backend communication
import { scadaBackendService } from './services/scadaBackendService';

// All methods in one service
scadaBackendService.getMachines()
scadaBackendService.getSensors()
scadaBackendService.getActiveAlarms()
scadaBackendService.connectWebSocket()
// ... etc
```

#### ✅ **Configurable Backend URL**
```typescript
// Environment-based configuration
VITE_BACKEND_URL=http://backend:8000  // Production
VITE_BACKEND_URL=http://localhost:8000 // Development
```

---

## 📊 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React + TypeScript | Latest | UI/UX |
| | Vite | 4.x | Build tool |
| | Tailwind CSS | 3.x | Styling |
| | Lucide Icons | Latest | Icons |
| **Backend** | FastAPI | 0.104+ | REST API |
| | SQLAlchemy | 2.x | ORM |
| | Pydantic | 2.x | Data validation |
| **Database** | PostgreSQL | 15 | Data persistence |
| **Real-time** | Mosquitto | Latest | MQTT Broker |
| **Containerization** | Docker | Latest | Container runtime |
| | Docker Compose | 3.9 | Orchestration |

---

## 🔄 Communication Patterns

### 1. **HTTP/REST** (Request-Response)
Frontend ↔ Backend for CRUD operations
- GET `/api/machines`
- POST `/api/alarms`
- GET `/api/sensors/{id}/history`

### 2. **WebSocket** (Real-time)
Frontend ↔ Backend for streaming data
- `/ws/realtime` - Subscribe to live sensor data
- Continuous data streaming
- Automatic reconnection handling

### 3. **MQTT** (Pub-Sub)
Backend ↔ Backend for system events
- Collector publishes sensor readings
- Backend subscribes and stores data
- Can extend with external systems

---

## 📦 Dependency Graph

```
Frontend App (React)
    ├── scadaBackendService
    │   ├── Fetch API (HTTP)
    │   └── WebSocket API
    │
    ├── Components
    │   ├── BoardsPage
    │   ├── AlarmsPage
    │   ├── MachineDetail
    │   ├── Dashboard
    │   └── ... (other features)
    │
    ├── Services
    │   ├── boardService (localStorage)
    │   ├── database (IndexedDB)
    │   ├── adminService
    │   └── historyService
    │
    └── State
        └── AppContext (backend URL)

Backend (FastAPI)
    ├── Database Layer
    │   └── PostgreSQL 15
    │
    ├── Models
    │   ├── Machine
    │   ├── Sensor
    │   ├── Alarm
    │   ├── PLC
    │   └── SensorReading
    │
    ├── Routes
    │   ├── /api/machines
    │   ├── /api/sensors
    │   ├── /api/alarms
    │   ├── /api/health
    │   └── /ws/realtime
    │
    ├── External Systems
    │   ├── MQTT Broker
    │   └── Configuration Files
    │
    └── Utilities
        ├── Database Connection
        ├── Config Management
        └── Error Handling
```

---

## 🗂️ File Structure

### Frontend Structure
```
frontend/
├── services/
│   ├── scadaBackendService.ts    ← Central API layer
│   ├── boardService.ts
│   ├── database.ts
│   ├── adminService.ts
│   └── historyService.ts
├── features/
│   ├── boards/
│   ├── alarms/
│   ├── dashboard/
│   ├── machineDetail/
│   ├── settings/
│   └── ... (other features)
├── components/
│   ├── Layout.tsx
│   └── MqttErrorDisplay.tsx
├── types.ts                        ← Shared types
├── App.tsx
└── index.tsx
```

### Backend Structure
```
backend/
├── api/
│   ├── main.py                    ← FastAPI entry
│   ├── models.py                  ← Database models
│   ├── database.py                ← DB connection
│   ├── schemas.py                 ← Pydantic schemas
│   └── migrations/                ← Database migrations
├── collector/
│   ├── main.py                    ← Data collector
│   └── models.py
├── config/
│   ├── settings.yml               ← Global config
│   └── machines/                  ← Machine configs
│       ├── bombo1.yml
│       ├── sec21.yml
│       └── ... (machines)
└── DOCS/                          ← Backend documentation
```

---

## 🔐 Security Considerations

### Authentication
- Token-based API authentication
- Bearer token in Authorization header
- Environment variable for API token

### Data Protection
- Database passwords in `.env` (not committed)
- HTTPS in production (nginx configuration)
- MQTT authentication (optional)
- SQL injection prevention (ORM)

### Access Control
- Single API token for backend access
- Role-based access can be added in v0.2
- WebSocket token validation

---

## 🚀 Deployment Architecture

### Single Server
```
Internet
    ↓
Nginx (80, 443)
    ├─ Frontend (React static)
    └─ Proxy to Backend (8000)
    ↓
FastAPI Backend (8000)
    ├─ PostgreSQL (5432)
    └─ Mosquitto (1883)
```

### Docker Stack
```
docker-compose up -d
├── frontend (nginx:latest)
├── backend (python:3.11)
├── db (postgres:15-alpine)
└── mqtt (eclipse-mosquitto)
```

---

## 📈 Scalability Considerations

### Current (v0.1.0)
- Single backend instance
- PostgreSQL on same host
- Good for up to 100s of sensors
- Real-time delay < 5 seconds

### Future (v0.2+)
- Multiple backend instances with load balancer
- Dedicated database server
- Redis caching layer
- Kafka for event streaming
- Microservices architecture

---

## 🔗 Related Documentation

- **[DOCKER_DEPLOYMENT.md](../DOCKER_DEPLOYMENT.md)** - Full deployment guide
- **[FRONTEND_INTEGRATION.md](../FRONTEND_INTEGRATION.md)** - Integration patterns
- **[QUICKSTART.md](../QUICKSTART.md)** - 5-minute setup
- **[VERSION.md](../VERSION.md)** - Release notes

---

## 📞 Document Navigation

| Previous | Next |
|----------|------|
| None | [01-SYSTEM_OVERVIEW.md](./01-SYSTEM_OVERVIEW.md) |

---

**Architecture Documentation v0.1.0** - Last Updated: November 27, 2025
