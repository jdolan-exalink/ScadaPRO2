# 02. Data Flow Architecture

Detailed data flow diagrams and sequence flows for all major operations in SCADA Pro.

## 📊 Overall Data Flow

```
                    SCADA Pro Data Flow

Sensors/Equipment (Industrial)
    │
    │ MQTT (telemetry)
    ▼
Mosquitto Broker
    │
    ├─► Backend (subscribes to topics)
    │   │
    │   ├─ Parse data
    │   ├─ Validate
    │   └─ Store in PostgreSQL
    │
    ├─► Frontend (optional real-time)
    │   └─ Display live updates
    │
    └─► External Systems (optional)
        └─ Forward to monitoring

User Interface (React)
    │
    ├─ HTTP GET /api/machines
    ├─ HTTP GET /api/sensors
    ├─ HTTP GET /api/alarms
    │
    ▼
FastAPI Backend
    │
    ├─ Query PostgreSQL
    ├─ Format response
    │
    ▼
JSON Response
    │
    ▼
React Component
    │
    ├─ Parse JSON
    ├─ Update state
    ├─ Re-render UI
    │
    ▼
Browser Display
```

---

## 🔄 Sequence Diagrams

### 1. Real-time Sensor Data Flow

```
Collector        MQTT Broker       Backend         Database
    │                │                 │              │
    ├─ Publish ──────►                 │              │
    │ sensors/temp    │                 │              │
    │ = 45.2          │                 │              │
    │                 │                 │              │
    │                 ├─ Route ────────►│              │
    │                 │ (subscription)  │              │
    │                 │                 ├─ Insert ───►│
    │                 │                 │ reading      │
    │                 │                 │              │
    │                 │                 ◄─ OK ────────┤
    │                 │                 │              │
    │                 │ (Optional)      │              │
    │                 ├─ WebSocket ────►│              │
    │                 │ (to Frontend)   │              │
    │                 │                 │              │
    └─────────────────┴─────────────────┴──────────────┘
    
Timeline: ~100-500ms total
```

### 2. Frontend Data Retrieval

```
React Component    Frontend Service    Backend API    Database
    │                   │                  │             │
    ├─ useEffect ──────►│                  │             │
    │ loadMachines()    │                  │             │
    │                   ├─ fetch /api ────►│             │
    │                   │ /machines        │             │
    │                   │                  ├─ SELECT ───►│
    │                   │                  │             │
    │                   │                  ◄─ rows ──────┤
    │                   │                  │             │
    │                   │◄─ JSON Response──┤             │
    │                   │                  │             │
    │◄─ setMachines ────┤                  │             │
    │                   │                  │             │
    ├─ render() ───────────────────────────────────────►│
    │ display machines                                   │
    │                                                    │
    └────────────────────────────────────────────────────┘

Timeline: REST call ~50-200ms
Polling interval: 5 seconds
```

### 3. Alarm Creation Flow

```
Sensor Reading    Backend Logic    Database    MQTT    Frontend
    │                 │               │        │          │
    ├─ value > 100 ──►│ Check Rules   │        │          │
    │                 │               │        │          │
    │                 ├─ Threshold    │        │          │
    │                 │   exceeded    │        │          │
    │                 │               │        │          │
    │                 ├─ Create ─────►│        │          │
    │                 │  Alarm        │        │          │
    │                 │  record       │        │          │
    │                 │               ◄─ OK ──┤          │
    │                 │               │        │          │
    │                 ├─ Publish ─────────────►│          │
    │                 │ alarms/sensor │        │          │
    │                 │               │        ├─ Route ─►│
    │                 │               │        │ to       │
    │                 │               │        │ Frontend │
    │                 │               │        │          │
    │                 │               │        │ ◄─ Poll ─┤
    │                 │               │        │ /alarms  │
    │                 │               │        │          │
    │                 │               │        ├─ Notify ►│
    │                 │               │        │ update   │
    │                 │               │        │          │
    └────────────────────────────────┴────────┴──────────┘

Timeline: 0-2 seconds
Alarm notification: Near real-time via WebSocket or polling
```

### 4. Machine Configuration Load

```
Startup                YAML Files        Database      Backend
   │                      │                 │            │
   ├─ Read Config ───────►│                 │            │
   │ /machines/*.yml      │                 │            │
   │                      ◄─ YAML Data ────┤            │
   │                      │                 │            │
   ├─ Parse YAML ─────────────────────────────────────►│
   │ Extract machines,    │                 │            │
   │ sensors, PLCs        │                 │            │
   │                      │                 │            │
   │                      │                 ├─ INSERT ──►│
   │                      │                 │ machines   │
   │                      │                 │ sensors    │
   │                      │                 │ plcs       │
   │                      │                 │            │
   │                      │                 ◄─ OK ──────┤
   │                      │                 │            │
   │◄─ Machines Ready ────────────────────────────────┤
   │                      │                 │            │
   └──────────────────────┴─────────────────┴───────────┘

Timeline: ~1-5 seconds (at startup)
Frequency: Once per startup
```

---

## 🎯 Component Data Flow

### Frontend Components

```
                    App.tsx (Root)
                        │
            ┌───────────┼───────────┐
            │           │           │
        Layout      Router      Context
            │           │         (backend URL)
            │      ┌────┼────┐
            │      │    │    │
        Navbar  BoardsPage Dashboard
            │      │    │    │
            │      │    │    ├─► scadaBackendService
            │      │    │    │   ├─ getMachines()
            │      │    │    │   ├─ getSensors()
            │      │    │    │   └─ getAlarms()
            │      │    │    │
            │      │    │    ├─► boardService
            │      │    │    │   └─ localStorage
            │      │    │    │
            │      │    │    └─► database (IndexedDB)
            │      │    │        └─ local persistence
            │      │    │
        AlarmsPage
            │      │
            ├─ scadaBackendService
            │   ├─ getActiveAlarms()
            │   ├─ getAlarms()
            │   └─ connectWebSocket()
            │
        MachineDetail
            │
            ├─ scadaBackendService
            │   ├─ getMachines()
            │   └─ getSensors()
            │
            └─ Widgets
                ├─ GaugeWidget
                ├─ LineChartWidget
                └─ StatusWidget
```

### Backend Request Handling

```
Request (HTTP/HTTPS)
    ↓
Nginx Reverse Proxy
    ├─ Strip /api prefix
    └─ Forward to backend:8000
    ↓
FastAPI Middleware
    ├─ Validate token
    ├─ Log request
    └─ CORS handling
    ↓
Route Handler
    ├─ Parse parameters
    ├─ Validate input
    └─ Business logic
    ↓
Database Query
    ├─ SQLAlchemy ORM
    ├─ Generate SQL
    └─ Execute
    ↓
Response Format (Pydantic)
    ├─ Serialize to JSON
    └─ Set headers
    ↓
Return to Client
```

---

## 📈 Data Model Relationships

```
Machine
  │
  ├─ (1 to Many) ─── Sensor
  │                    │
  │                    ├─ (1 to Many) ─── SensorReading
  │                    │                   (time-series data)
  │                    │
  │                    └─ (1 to Many) ─── Alarm
  │                                       (triggered by threshold)
  │
  └─ (1 to Many) ─── PLC
                      │
                      └─ (1 to Many) ─── Sensor
                                         (PLC controls sensors)
```

### Entity Relationships

#### Machine → Sensors
- One machine has many sensors
- Sensors group by machine in UI
- Alarms associated with machine

#### Sensor → Readings
- One sensor has many readings
- Time-series data
- Stored for historical analysis

#### Sensor → Alarms
- Sensor value triggers alarm
- Multiple alarms per sensor possible
- Alarm history maintained

#### PLC → Sensors
- PLC reads sensor values
- PLC may control equipment
- Configuration-based relationship

---

## 🔗 API Integration Flow

### GET /api/machines

```
Client Request
    │
    ▼
GET /api/machines
Authorization: Bearer {token}
    │
    ▼
Backend Receives
    ├─ Validate token ✓
    ├─ Check authorization ✓
    └─ Process request
    │
    ▼
Query Builder
    │
    SELECT * FROM machines
    WHERE status = 'active'
    ORDER BY name
    │
    ▼
Database Query
    │
    Fetch rows
    │
    ▼
ORM Mapping
    │
    SQLAlchemy models → Pydantic schemas
    │
    ▼
JSON Response
    │
    [
      {
        "id": 1,
        "name": "Bomba 1",
        "code": "BOMBO1",
        "status": "active"
      },
      ...
    ]
    │
    ▼
Client Receives
    │
    Parse JSON
    Update state
    Re-render UI
```

### WebSocket Connection (/ws/realtime)

```
Client (Browser)
    │
    ├─ WS connection request
    ├─ Token in query param
    ▼
Backend WebSocket Handler
    │
    ├─ Validate token
    ├─ Accept connection
    ├─ Track client
    ▼
Client Connected
    │
    ├─ Server waiting for messages
    │
    ├─ Sensors publish MQTT data
    ├─ Backend receives MQTT
    ├─ Backend broadcasts to WebSocket clients
    ▼
Client Receives Data
    │
    message = {
      "type": "sensor_update",
      "sensor_id": 1,
      "value": 45.2,
      "timestamp": 1234567890
    }
    │
    ├─ Parse
    ├─ Update state
    ├─ Re-render (optional)
    ▼
User Sees Update
    │
    Dashboard updates in real-time
    Graph draws new point
```

---

## 🔐 Authentication Flow

```
1. Deployment Setup
   ├─ Generate API token
   ├─ Store in .env
   └─ Backend starts with token

2. Frontend Initialization
   ├─ Read VITE_BACKEND_URL from env
   ├─ Initialize scadaBackendService
   ├─ Store backend URL in context
   └─ Ready to make requests

3. API Request
   ├─ Frontend prepares request
   ├─ Adds Authorization header
   │  Authorization: Bearer {token}
   ├─ Sends to backend
   └─ Backend validates

4. Token Validation
   ├─ Backend extracts token
   ├─ Compare with stored token
   ├─ If match → Allow request
   └─ If no match → Return 401
```

---

## 📊 Data Retention Policy

```
Real-time Data (MQTT)
    │
    └─ Kept in memory ~5 seconds
       (for live dashboards)
       │
       ▼
    Stored in PostgreSQL
    │
    └─ Kept indefinitely
       (historical analysis)
       │
       ├─ 1 hour: Full resolution (5s intervals)
       │
       ├─ 1 day: 1-minute averages
       │
       ├─ 1 month: 1-hour averages
       │
       └─ 1 year: Daily averages
          (optional archive cleanup)
```

---

## 🚨 Error Handling Flow

```
Request → Backend
    │
    ▼
Error Occurs?
    │
    ├─ YES: Generate Error Response
    │   │
    │   ├─ 400: Bad Request (invalid params)
    │   ├─ 401: Unauthorized (invalid token)
    │   ├─ 403: Forbidden (insufficient perms)
    │   ├─ 404: Not Found (resource missing)
    │   ├─ 500: Server Error (unexpected)
    │   │
    │   ├─ Log Error Details
    │   ├─ Return JSON error
    │   │
    │   ▼
    │ Response to Client
    │   {
    │     "error": "Machine not found",
    │     "status": 404
    │   }
    │   │
    │   ▼
    │ Frontend Error Handling
    │   ├─ Log error
    │   ├─ Show user message
    │   └─ Suggest action
    │
    └─ NO: Success Response
        └─ Return data
```

---

## 📚 Related Documentation

- [01-SYSTEM_OVERVIEW.md](./01-SYSTEM_OVERVIEW.md) - System overview
- [03-COMPONENT_ARCHITECTURE.md](./03-COMPONENT_ARCHITECTURE.md) - Component breakdown
- [05-SERVICE_LAYER.md](./05-SERVICE_LAYER.md) - Service layer details

---

## 📞 Document Navigation

| Previous | Next |
|----------|------|
| [01-SYSTEM_OVERVIEW.md](./01-SYSTEM_OVERVIEW.md) | [03-COMPONENT_ARCHITECTURE.md](./03-COMPONENT_ARCHITECTURE.md) |

---

**Data Flow Architecture v0.1.0** - Last Updated: November 27, 2025
