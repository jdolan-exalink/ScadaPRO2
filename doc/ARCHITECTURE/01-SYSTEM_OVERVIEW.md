# 01. ScadaPRO2 - System Overview

High-level overview of the ScadaPRO2 v0.2.0 industrial IoT monitoring system.

## 🎯 System Purpose

ScadaPRO2 is a **production-ready industrial IoT monitoring dashboard** that collects, analyzes, and visualizes real-time sensor data from industrial machines and processes.

### Key Capabilities
- ✅ Real-time sensor monitoring (5-second polling)
- ✅ Machine and equipment tracking
- ✅ Alarm system with severity levels
- ✅ Historical data analysis
- ✅ Custom dashboard creation
- ✅ Multi-machine support

---

## 📐 System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCADA Pro System                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                  Presentation Layer                     │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │  React Web Application (Port 80/443)            │   │  │
│  │  │  - SCADA Boards & Widgets                       │   │  │
│  │  │  - Alarms Management Center                     │   │  │
│  │  │  - Machine Detail Pages                         │   │  │
│  │  │  - Settings & Configuration                     │   │  │
│  │  │  - Real-time Dashboard                          │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──────────┬──────────────────────────────────────────────┘  │
│             │ HTTP/WebSocket                                   │
│  ┌──────────▼──────────────────────────────────────────────┐  │
│  │                  Application Layer                      │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │  FastAPI Backend (Port 8000)                    │   │  │
│  │  │  - REST API Endpoints                           │   │  │
│  │  │  - WebSocket Real-time Streaming               │   │  │
│  │  │  - Business Logic                              │   │  │
│  │  │  - Authentication                              │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──┬─────────────────────────────────┬────────────────────┘  │
│     │                                 │                        │
│  ┌──▼────────────┐         ┌──────────▼──────┐                │
│  │  Data Layer   │         │ Integration     │                │
│  ├───────────────┤         ├─────────────────┤                │
│  │ PostgreSQL 15 │         │ MQTT Broker     │                │
│  │ (Port 5432)   │         │ (Port 1883)     │                │
│  │               │         │                 │                │
│  │ - Machines    │         │ - Sensor Data   │                │
│  │ - Sensors     │         │ - System Events │                │
│  │ - Readings    │         │ - Telemetry    │                │
│  │ - Alarms      │         │                 │                │
│  │ - Users       │         │ Mosquitto       │                │
│  │ - Config      │         │                 │                │
│  └───────────────┘         └─────────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Core Components

### 1. Frontend (React + Vite)
**Location**: `/frontend`  
**Port**: 80 (HTTP), 443 (HTTPS)

#### Responsibilities:
- User interface rendering
- Real-time data visualization
- User interaction handling
- Local state management (IndexedDB, localStorage)
- Board/dashboard persistence

#### Key Features:
- **Boards System**: Custom SCADA dashboard creation
- **Widgets**: Gauge, KPI, Status, LineChart, Alarms
- **Real-time Updates**: 5-second polling frequency
- **Responsive Design**: Works on desktop and tablet
- **Dark Industrial Theme**: Professional UI

#### Technology Stack:
- React 18+ with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Lucide React for icons
- IndexedDB for local storage

---

### 2. Backend API (FastAPI)
**Location**: `/backend/api`  
**Port**: 8000

#### Responsibilities:
- RESTful API endpoints
- WebSocket real-time streaming
- Database operations (CRUD)
- Business logic implementation
- Authentication & validation
- Configuration management

#### Key Endpoints:
```
GET    /api/machines              # List all machines
GET    /api/sensors               # List all sensors
GET    /api/sensors/{id}/history  # Historical data
GET    /api/alarms                # List alarms
GET    /api/alarms/active         # Active alarms only
GET    /api/health                # Health check
WS     /ws/realtime               # WebSocket streaming
```

#### Technology Stack:
- FastAPI framework
- SQLAlchemy ORM
- Pydantic data validation
- PostgreSQL database
- Uvicorn ASGI server

---

### 3. Database (PostgreSQL)
**Location**: Docker service  
**Port**: 5432

#### Responsibilities:
- Data persistence
- Relational data integrity
- Query performance
- Historical data storage

#### Key Tables:
```
machines          - Industrial machines
sensors           - Sensor definitions
plcs              - Programmable logic controllers
alarms            - Alarm events
sensor_readings   - Time-series sensor data
```

#### Design:
- Normalized schema (3NF)
- Indexes on frequently queried columns
- Referential integrity constraints
- Audit timestamp fields

---

### 4. Real-time Messaging (MQTT)
**Location**: Mosquitto Broker  
**Port**: 1883

#### Responsibilities:
- Sensor data streaming
- System event distribution
- Real-time notifications

#### Message Topics:
```
sensors/{machine}/+/value       # Sensor readings
system/status                   # System status
system/postgresql               # Database stats
alarms/{machine}                # Alarm events
```

#### Benefits:
- Lightweight pub-sub model
- Low latency
- Persistent connections
- Automatic reconnection

---

## 🔄 Data Flow

### Real-time Data Collection

```
1. Industrial Equipment
   ↓
2. Collector/PLC (sends data)
   ↓
3. MQTT Broker
   ↓
4. Backend (subscribes)
   ↓
5. PostgreSQL (stores)
   ↓
6. Frontend (polls REST API)
   ↓
7. User Dashboard (displays)
```

### Alarm Handling

```
1. Sensor value exceeds threshold
   ↓
2. Backend logic detects alarm
   ↓
3. Alarm record created (PostgreSQL)
   ↓
4. MQTT notification published
   ↓
5. Frontend polls /api/alarms/active
   ↓
6. AlarmsPage updates (red badge)
   ↓
7. User notified in UI
```

---

## 🏗️ Deployment Architecture

### Container Services

```
docker-compose.yml defines:

1. frontend
   - Image: node:18-alpine
   - Build: ./frontend (React app)
   - Port: 80/443
   - Nginx serving static files + reverse proxy

2. backend
   - Image: python:3.11-slim
   - Build: ./backend/api
   - Port: 8000
   - FastAPI server with Uvicorn

3. db
   - Image: postgres:15-alpine
   - Port: 5432
   - Persistent volume: postgres_data

4. mqtt
   - Image: eclipse-mosquitto:latest
   - Port: 1883 (MQTT), 9001 (WebSocket)
   - Persistent volume: mqtt_data
```

### Network Architecture

```
Host/Docker Network
├── frontend (nginx:80/443)
│   ├── Serves React static files
│   ├── Proxies API requests to backend:8000
│   └── Proxies WebSocket to backend:8000/ws
│
├── backend (fastapi:8000)
│   ├── REST API endpoints
│   ├── WebSocket connections
│   └── Database queries to db:5432
│       └── MQTT connection to mqtt:1883
│
├── db (postgres:5432)
│   ├── Accepts connections from backend
│   └── Persistent volume mounted
│
└── mqtt (mosquitto:1883)
    └── Message broker for all services
```

---

## 🔐 Security Architecture

### Authentication Flow

```
1. Frontend requests backend data
   ↓
2. Bearer token in Authorization header
   ↓
3. Backend validates token
   ↓
4. If valid → Process request
   If invalid → Return 401 Unauthorized
```

### Token Management
- Generated once during deployment
- Stored in `.env` file (not in git)
- Used for all API requests
- Can be rotated by restarting backend

### Network Security
- HTTPS in production (nginx configuration)
- MQTT can use authentication
- Database behind private network
- API rate limiting (optional)

---

## 📊 Data Model

### Core Entities

#### Machine
```
Machine
├── id (integer, primary key)
├── name (string) - "Bomba 1", "Sector 2"
├── description (text)
├── code (string) - "BOMBO1"
├── status (enum) - "active", "inactive"
├── created_at (timestamp)
└── updated_at (timestamp)
```

#### Sensor
```
Sensor
├── id (integer, primary key)
├── machine_id (FK to Machine)
├── name (string)
├── description (text)
├── unit (string) - "°C", "bar", "RPM"
├── type (enum) - "temperature", "pressure", "flow"
├── last_value (float)
├── mqtt_topic (string)
├── created_at (timestamp)
└── updated_at (timestamp)
```

#### SensorReading
```
SensorReading
├── id (integer, primary key)
├── sensor_id (FK to Sensor)
├── value (float)
├── timestamp (datetime)
└── quality_flag (enum)
```

#### Alarm
```
Alarm
├── id (integer, primary key)
├── sensor_id (FK to Sensor)
├── severity (enum) - "critical", "high", "medium", "low"
├── message (string)
├── triggered_at (datetime)
├── acknowledged_at (datetime, nullable)
├── acknowledged_by (string, nullable)
└── resolved_at (datetime, nullable)
```

---

## 🔌 Integration Points

### External Systems
1. **Data Collectors** - Send sensor data via MQTT
2. **Configuration Files** - YAML-based machine/sensor config
3. **Monitoring Systems** - Can receive MQTT data
4. **Logging Systems** - Backend logs to stdout/file

### APIs Used
1. **REST API** - Primary frontend-backend communication
2. **WebSocket API** - Real-time data streaming
3. **MQTT API** - Pub-sub messaging

---

## 📈 Performance Characteristics

### Typical Load
- **Machines**: 10-100 per deployment
- **Sensors**: 100-1000 per deployment
- **Polling Frequency**: 5 seconds
- **Concurrent Users**: 5-50

### Response Times
- REST endpoints: < 100ms
- WebSocket latency: < 50ms
- Database queries: < 50ms
- Frontend rendering: < 100ms

### Storage
- Historical data: ~1KB per sensor per day
- 1 year of data = ~365MB per sensor
- 100 sensors × 1 year = ~36GB

---

## 🚀 Deployment Scenarios

### Development
```
docker-compose up -d
# All services on localhost
# Frontend: http://localhost
# Backend: http://localhost:8000
# Database: localhost:5432
```

### Production (Single Server)
```
- Run docker-compose on dedicated server
- Configure HTTPS with nginx
- Regular database backups
- Monitor resource usage
- Set resource limits in compose file
```

### Production (Distributed)
```
- Load balancer for multiple backends
- Separate database server
- Separate MQTT broker
- Redis caching layer
- Log aggregation (ELK stack)
```

---

## 🔄 Version Management

### Current Version
- **v0.1.0** - Initial release
- **Release Date**: November 27, 2025
- **Status**: Production Ready

### Versioning Strategy
- Semantic versioning (MAJOR.MINOR.PATCH)
- Git tags for releases
- CHANGELOG for tracking changes
- VERSION.md for release notes

---

## 📚 Related Documentation

| Document | Purpose |
|----------|---------|
| [02-DATA_FLOW.md](./02-DATA_FLOW.md) | Detailed data flow diagrams |
| [03-COMPONENT_ARCHITECTURE.md](./03-COMPONENT_ARCHITECTURE.md) | Component breakdown |
| [04-FRONTEND_ARCHITECTURE.md](./04-FRONTEND_ARCHITECTURE.md) | React application structure |
| [05-SERVICE_LAYER.md](./05-SERVICE_LAYER.md) | Backend service abstraction |
| [07-BACKEND_API.md](./07-BACKEND_API.md) | API endpoints reference |
| [08-DATABASE_SCHEMA.md](./08-DATABASE_SCHEMA.md) | Database design |
| [11-DOCKER_ARCHITECTURE.md](./11-DOCKER_ARCHITECTURE.md) | Docker setup |

---

## 📞 Document Navigation

| Previous | Next |
|----------|------|
| [00-README.md](./00-README.md) | [02-DATA_FLOW.md](./02-DATA_FLOW.md) |

---

**System Overview v0.1.0** - Last Updated: November 27, 2025
