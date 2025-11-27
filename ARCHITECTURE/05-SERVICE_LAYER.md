# 05. Frontend Service Layer Architecture

Detailed documentation of the frontend service abstraction layer - the unified interface between React components and the backend API.

## 🎯 Purpose

The service layer provides:
- **Single source of truth** for backend communication
- **Abstraction** of HTTP/WebSocket details
- **Centralized configuration** (API URL, tokens)
- **Error handling** and retry logic
- **Type safety** with TypeScript
- **Easy testing** through mocking

---

## 🏗️ Service Layer Architecture

```
React Components
    │
    ├─ BoardsPage.tsx ──┐
    ├─ AlarmsPage.tsx   ├─► scadaBackendService.ts
    ├─ Dashboard.tsx    │   (Unified API Layer)
    ├─ MachineDetail.tsx│
    └─ SettingsPage.tsx─┘
            │
            ▼
    scadaBackendService
    ├─ Configuration
    │  ├─ Backend URL
    │  ├─ API Token
    │  └─ Timeout values
    │
    ├─ HTTP Methods
    │  ├─ GET /api/machines
    │  ├─ GET /api/sensors
    │  ├─ GET /api/alarms
    │  └─ ... (11+ endpoints)
    │
    ├─ WebSocket Methods
    │  └─ connectWebSocket()
    │
    └─ Error Handling
        ├─ Retry logic
        ├─ Timeout handling
        └─ User-friendly errors
            │
            ▼
        FastAPI Backend
        (Port 8000)
            │
            ▼
        PostgreSQL + MQTT
```

---

## 📦 Core Service: scadaBackendService.ts

### File Location
```
frontend/services/scadaBackendService.ts
```

### Service Structure

```typescript
// Configuration
class ScadaBackendService {
  private apiUrl: string
  private token: string
  private wsConnection: WebSocket | null
  private wsHandlers: Map<string, Function>
  
  // 1. Configuration Methods
  setBackendUrl(url: string)
  getBackendUrl(): string
  setApiToken(token: string)
  
  // 2. Machine Endpoints
  getMachines(): Promise<Machine[]>
  getMachine(id: string): Promise<Machine>
  getPLCs(): Promise<PLC[]>
  
  // 3. Sensor Endpoints
  getSensors(): Promise<Sensor[]>
  getSensorHistory(sensorId: string, from: Date, to: Date): Promise<HistoryDatapoint[]>
  getSensorValues(sensorIds: string[]): Promise<SensorValue[]>
  
  // 4. Alarm Endpoints
  getAlarms(): Promise<Alarm[]>
  getActiveAlarms(): Promise<Alarm[]>
  getMachineAlarms(machineId: string): Promise<Alarm[]>
  
  // 5. System Endpoints
  checkHealth(): Promise<boolean>
  getVersion(): Promise<string>
  
  // 6. Real-time Methods
  connectWebSocket(): Promise<void>
  subscribeToSensorData(callback: Function)
  disconnectWebSocket()
  
  // 7. Error Handling
  private handleError(error: Error): void
  private withRetry(fn: Function, retries: number): Promise<any>
}
```

---

## 🔌 API Endpoints Provided

### 1. Machines

#### `getMachines(): Promise<Machine[]>`
Get all machines in the system
```typescript
import { scadaBackendService } from './services/scadaBackendService';

const machines = await scadaBackendService.getMachines();
// Result: [
//   { id: 1, name: "Bomba 1", code: "BOMBO1", status: "active" },
//   { id: 2, name: "Sector 2", code: "SEC2", status: "active" }
// ]
```

#### `getMachine(id: string): Promise<Machine>`
Get a specific machine
```typescript
const machine = await scadaBackendService.getMachine("1");
// Result: { id: 1, name: "Bomba 1", ... }
```

#### `getPLCs(): Promise<PLC[]>`
Get all PLCs
```typescript
const plcs = await scadaBackendService.getPLCs();
// Result: [
//   { id: 1, name: "PLC-1", code: "PLC001", ... }
// ]
```

---

### 2. Sensors

#### `getSensors(): Promise<Sensor[]>`
Get all sensors
```typescript
const sensors = await scadaBackendService.getSensors();
// Result: [
//   {
//     id: 1,
//     name: "Temperature",
//     machine_id: 1,
//     unit: "°C",
//     type: "temperature",
//     last_value: 45.2
//   },
//   ...
// ]
```

#### `getSensorHistory(sensorId: string, from: Date, to: Date): Promise<HistoryDatapoint[]>`
Get historical data for a sensor
```typescript
const history = await scadaBackendService.getSensorHistory(
  "1",
  new Date(Date.now() - 24*3600*1000), // 24 hours ago
  new Date()                             // now
);
// Result: [
//   { timestamp: 1234567890000, value: 42.1 },
//   { timestamp: 1234567950000, value: 42.3 },
//   ...
// ]
```

#### `getSensorValues(sensorIds: string[]): Promise<SensorValue[]>`
Get current values for multiple sensors
```typescript
const values = await scadaBackendService.getSensorValues(['1', '2', '3']);
// Result: [
//   { sensor_id: 1, value: 45.2, timestamp: 1234567890 },
//   { sensor_id: 2, value: 78.5, timestamp: 1234567890 },
//   ...
// ]
```

---

### 3. Alarms

#### `getAlarms(): Promise<Alarm[]>`
Get all alarms (active and historical)
```typescript
const allAlarms = await scadaBackendService.getAlarms();
```

#### `getActiveAlarms(): Promise<Alarm[]>`
Get only active (unresolved) alarms
```typescript
const activeAlarms = await scadaBackendService.getActiveAlarms();
// Result: [
//   {
//     id: 1,
//     sensor_id: 1,
//     severity: "critical",
//     message: "Temperature exceeded threshold",
//     triggered_at: "2025-01-27T10:30:00Z",
//     acknowledged_at: null
//   },
//   ...
// ]
```

#### `getMachineAlarms(machineId: string): Promise<Alarm[]>`
Get alarms for a specific machine
```typescript
const machineAlarms = await scadaBackendService.getMachineAlarms("1");
```

---

### 4. System

#### `checkHealth(): Promise<boolean>`
Check if backend is available
```typescript
const isHealthy = await scadaBackendService.checkHealth();
if (isHealthy) {
  console.log('Backend is operational');
} else {
  console.log('Backend is down');
}
```

#### `getVersion(): Promise<string>`
Get backend version
```typescript
const version = await scadaBackendService.getVersion();
// Result: "0.1.0"
```

---

### 5. Real-time Methods

#### `connectWebSocket(): Promise<void>`
Connect to WebSocket for real-time data
```typescript
try {
  await scadaBackendService.connectWebSocket();
  console.log('WebSocket connected');
} catch (error) {
  console.error('Failed to connect:', error);
}
```

#### `subscribeToSensorData(callback: Function)`
Subscribe to sensor data updates
```typescript
scadaBackendService.subscribeToSensorData((data) => {
  console.log('New data:', data);
  // data = {
  //   type: "sensor_update",
  //   sensor_id: 1,
  //   value: 45.3,
  //   timestamp: 1234567890
  // }
});
```

#### `disconnectWebSocket()`
Disconnect from WebSocket
```typescript
scadaBackendService.disconnectWebSocket();
```

---

## ⚙️ Configuration

### Setting Backend URL

```typescript
// Development (auto-detected)
scadaBackendService.setBackendUrl('http://localhost:8000');

// Production (from environment)
const backendUrl = import.meta.env.VITE_BACKEND_URL;
scadaBackendService.setBackendUrl(backendUrl);

// Verify
console.log(scadaBackendService.getBackendUrl());
// Output: http://localhost:8000
```

### Environment Variables

```bash
# .env / .env.example
VITE_BACKEND_URL=http://localhost:8000        # Development
VITE_API_TOKEN=your_token_here                # API authentication
```

### Runtime Configuration

```typescript
// In App.tsx or AppContext
useEffect(() => {
  const backendUrl = currentBackend || 
    import.meta.env.VITE_BACKEND_URL || 
    'http://localhost:8000';
  
  scadaBackendService.setBackendUrl(backendUrl);
  scadaBackendService.setApiToken(import.meta.env.VITE_API_TOKEN);
}, [currentBackend]);
```

---

## 🛡️ Error Handling

### Built-in Error Handling

```typescript
// Automatic error handling
try {
  const machines = await scadaBackendService.getMachines();
} catch (error) {
  // Error types:
  // - NetworkError (server unreachable)
  // - ValidationError (invalid response)
  // - AuthenticationError (invalid token)
  // - TimeoutError (request too slow)
  
  console.error('Failed to fetch machines:', error.message);
}
```

### Retry Logic

```typescript
// Automatic retries on network failure
// Built into service layer
// Retry policy:
// - 3 attempts max
// - 500ms initial delay
// - Exponential backoff
```

---

## 📊 Usage Examples

### Complete Example: Fetching Machine Data

```typescript
import { useEffect, useState } from 'react';
import { scadaBackendService } from './services/scadaBackendService';
import { Machine, Sensor } from './types';

export const MachineList: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [machineData, sensorData] = await Promise.all([
          scadaBackendService.getMachines(),
          scadaBackendService.getSensors()
        ]);
        setMachines(machineData);
        setSensors(sensorData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Machines ({machines.length})</h2>
      <ul>
        {machines.map(machine => (
          <li key={machine.id}>{machine.name}</li>
        ))}
      </ul>
      
      <h2>Sensors ({sensors.length})</h2>
      <ul>
        {sensors.map(sensor => (
          <li key={sensor.id}>
            {sensor.name}: {sensor.last_value} {sensor.unit}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### Real-time Data Example

```typescript
useEffect(() => {
  const connectRealtime = async () => {
    try {
      await scadaBackendService.connectWebSocket();
      
      scadaBackendService.subscribeToSensorData((data) => {
        if (data.type === 'sensor_update') {
          setSensorValues(prev => ({
            ...prev,
            [data.sensor_id]: data.value
          }));
        }
      });
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  };

  connectRealtime();

  return () => {
    scadaBackendService.disconnectWebSocket();
  };
}, []);
```

---

## 🧪 Testing the Service

### Unit Tests

```typescript
import { scadaBackendService } from './scadaBackendService';

describe('ScadaBackendService', () => {
  beforeEach(() => {
    scadaBackendService.setBackendUrl('http://localhost:8000');
  });

  test('should fetch machines', async () => {
    const machines = await scadaBackendService.getMachines();
    expect(machines).toBeDefined();
    expect(Array.isArray(machines)).toBe(true);
  });

  test('should fetch sensors', async () => {
    const sensors = await scadaBackendService.getSensors();
    expect(sensors).toBeDefined();
  });

  test('should handle errors gracefully', async () => {
    scadaBackendService.setBackendUrl('http://invalid-url:9999');
    try {
      await scadaBackendService.getMachines();
      expect(true).toBe(false); // Should throw
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
```

### Manual Testing

```bash
# 1. Start backend
docker-compose up backend

# 2. In browser console, test service
```

```typescript
// In browser console
import { scadaBackendService } from './services/scadaBackendService';

// Set URL
scadaBackendService.setBackendUrl('http://localhost:8000');

// Test endpoints
scadaBackendService.getMachines().then(m => console.log('Machines:', m));
scadaBackendService.getSensors().then(s => console.log('Sensors:', s));
scadaBackendService.getActiveAlarms().then(a => console.log('Alarms:', a));

// Test health
scadaBackendService.checkHealth().then(h => console.log('Healthy:', h));
```

---

## 🔄 Migration from Old Service Layer

### Before (Old iotService)
```typescript
import { iotService } from './services/iotService';
const machines = await iotService.getMachines();
```

### After (New scadaBackendService)
```typescript
import { scadaBackendService } from './services/scadaBackendService';
const machines = await scadaBackendService.getMachines();
```

### Key Improvements
✅ Simplified API (single service)
✅ Better error handling
✅ Consistent naming
✅ Unified configuration
✅ Better TypeScript support
✅ Easier testing

---

## 📚 Related Documentation

- [04-FRONTEND_ARCHITECTURE.md](./04-FRONTEND_ARCHITECTURE.md) - React component architecture
- [06-STATE_MANAGEMENT.md](./06-STATE_MANAGEMENT.md) - State management patterns
- [10-INTEGRATION_PATTERNS.md](./10-INTEGRATION_PATTERNS.md) - Integration best practices

---

## 📞 Document Navigation

| Previous | Next |
|----------|------|
| [04-FRONTEND_ARCHITECTURE.md](./04-FRONTEND_ARCHITECTURE.md) | [06-STATE_MANAGEMENT.md](./06-STATE_MANAGEMENT.md) |

---

**Service Layer Architecture v0.1.0** - Last Updated: November 27, 2025
