# 🔄 Frontend Integration with Backend - Migration Guide

## Overview

This document describes the integration of the SCADA Pro frontend with the real industrial IoT backend.

### What Changed?

**Before**: Frontend had an embedded Node.js backend + local database
**Now**: Frontend uses the real FastAPI backend from `/backend` directory

### Key Changes

1. **New Service**: `services/scadaBackendService.ts`
   - Centralized backend communication layer
   - Unified API for all backend calls
   - Configurable backend URL via environment variables

2. **Updated Components**:
   - `features/boards/BoardsPage.tsx` - Uses scadaBackendService
   - `features/boards/BoardWidgets.tsx` - Uses scadaBackendService
   - `features/alarms/AlarmsPage.tsx` - Fully implemented with real alarm data

3. **Configuration**:
   - Environment variable: `VITE_BACKEND_URL`
   - Set via docker-compose or .env

## API Endpoint Mapping

### Machines

| Frontend Need | Backend Endpoint | Method | Notes |
|---|---|---|---|
| Get machines | `/api/machines` | GET | List all machines |
| Get machine detail | `/api/machines/{id}` | GET | Specific machine info |

### Sensors

| Frontend Need | Backend Endpoint | Method | Notes |
|---|---|---|---|
| Get sensors | `/api/sensors` | GET | All sensors, filterable |
| Get with MQTT | `/api/sensors/mqtt-topics` | GET | Includes MQTT topics |
| Get history | `/api/sensors/{id}/history?from=&to=` | GET | Historical data |
| Get values | (via WebSocket) | WS | Real-time sensor data |

### Alarms

| Frontend Need | Backend Endpoint | Method | Notes |
|---|---|---|---|
| Active alarms | `/api/alarms/active` | GET | Current alarms only |
| All alarms | `/api/alarms` | GET | Full history |
| Machine alarms | `/api/machines/{id}/alarms` | GET | Per-machine history |

## Service Architecture

### scadaBackendService.ts

New centralized service that provides:

```typescript
// Machines
getMachines(): Promise<Machine[]>
getMachine(id: number): Promise<Machine | null>

// Sensors
getSensors(filters?): Promise<Sensor[]>
getSensorsWithMQTTTopics(filters?): Promise<SensorWithMQTT[]>
getSensor(id: number): Promise<Sensor | null>
getSensorHistory(id, from, to): Promise<HistoryDatapoint[]>
getSensorValues(machineCode?): Promise<{sensors}>

// Alarms
getActiveAlarms(filters?): Promise<Alarm[]>
getAlarms(filters?): Promise<Alarm[]>
getMachineAlarms(machineId): Promise<Alarm[]>

// System
checkHealth(): Promise<boolean>
getVersion(): Promise<string>

// Real-time
connectWebSocket(...): WebSocket | null
subscribeToSensorData(ws, codes): void
```

## Environment Variables

### In docker-compose.yml

```yaml
environment:
  VITE_BACKEND_URL: http://backend:8000
  VITE_API_TOKEN: ${API_TOKEN}
```

### In .env (local development)

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_API_TOKEN=your_api_token
```

### In frontend Dockerfile build

The Vite build will use these variables during build time.

## Component Updates

### BoardsPage.tsx

**Before**:
```typescript
import { iotService } from '../../services/iotService';
const [m, p, s] = await Promise.all([
  iotService.getConnectedMachines(),
  iotService.getPLCs(),
  iotService.getSensors(),
]);
```

**After**:
```typescript
import { scadaBackendService } from '../../services/scadaBackendService';
const [m, p, s] = await Promise.all([
  scadaBackendService.getMachines(),
  scadaBackendService.getPLCs(),
  scadaBackendService.getSensors(),
]);
```

### BoardWidgets.tsx

**Before**:
```typescript
const history = await iotService.getSensorHistoryByCode(sensorCode, from, to);
```

**After**:
```typescript
const sensors = await scadaBackendService.getSensors();
const sensor = sensors.find(s => s.code === sensorCode);
const history = await scadaBackendService.getSensorHistory(sensor.id, from, to);
```

### AlarmsPage.tsx

**Completely Rewritten**:
- Now consumes real alarm data from backend
- Filters by severity and machine
- Shows active vs historical alarms
- Real-time status updates

## Data Flow

```
User Browser
    ↓
Frontend (React/Vite)
    ├─ BoardsPage
    ├─ AlarmsPage
    └─ BoardWidgets
    ↓ (scadaBackendService)
    ↓
HTTP/WebSocket to Backend
    ↓
Backend API (FastAPI)
    ├─ /api/machines
    ├─ /api/sensors
    ├─ /api/alarms
    ├─ /ws/realtime (WebSocket)
    ↓
PostgreSQL + MQTT
    ├─ machines table
    ├─ sensors table
    ├─ sensor_data table
    ├─ machine_alarms table
    └─ MQTT topics (machines/*/*/*)
```

## Testing the Integration

### 1. Verify Backend is Running

```bash
curl http://localhost:8000/api/health
# Should return: {"status": "ok"}
```

### 2. Get API Token

```bash
# Check where token is stored
cat /backend/config/api_token.txt
export API_TOKEN=$(cat /backend/config/api_token.txt)
```

### 3. Test Frontend Can Call Backend

```bash
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8000/api/machines
# Should return list of machines
```

### 4. Test Frontend in Browser

```
http://localhost
```

Check browser console for any errors:
- F12 → Console tab
- Look for network errors to `/api/`
- Check scadaBackendService initialization

### 5. Test Alarms Page

```
http://localhost/alarms
```

Should show:
- Active alarms count
- List of alarms with filters
- Severity colors and icons

### 6. Test Boards with Real Data

```
http://localhost/boards
```

Should show:
- Machines from backend
- Sensors for selected machine
- Live widget data

## Troubleshooting

### Frontend Can't Connect to Backend

**Symptom**: Blank page or "cannot connect" errors

**Solutions**:
1. Check VITE_BACKEND_URL is correct
2. Verify backend is running: `docker-compose ps`
3. Check logs: `docker-compose logs backend`
4. Test connectivity: `curl http://backend:8000/api/health`

### Machines Not Loading

**Symptom**: "Sin máquinas" or empty machines list

**Solutions**:
1. Check machines exist in backend: `curl http://localhost:8000/api/machines`
2. Check API token: `echo $API_TOKEN`
3. Verify scadaBackendService has correct URL
4. Check backend logs: `docker-compose logs backend`

### Alarms Not Showing

**Symptom**: Empty alarms page

**Solutions**:
1. Check alarms exist: `curl http://localhost:8000/api/alarms/active`
2. Verify backend can access database
3. Check alarm configuration in machine YAML files

### Real-time Data Not Updating

**Symptom**: Widget values don't change

**Solutions**:
1. Check MQTT is running: `docker-compose ps mqtt`
2. Verify WebSocket is connecting: Check Network tab in browser DevTools
3. Restart MQTT: `docker-compose restart mqtt`
4. Check sensor readings: `docker-compose exec mqtt mosquitto_sub -h localhost -t "machines/#"`

## Removing Old Code

The following should be deleted/deprecated:

- `frontend/backend/` - Old Node.js backend (no longer needed)
- `frontend/docker-compose.yml` - Old stack (use root docker-compose.yml)
- `frontend/docker-compose.local.yml` - Old local stack
- `frontend/docker-compose.frontend-only.yml` - Old frontend-only stack
- References to `iotService` that aren't updated
- Old mock data services

All functionality is now in:
- `services/scadaBackendService.ts` - Real backend integration
- `services/boardService.ts` - Board layout persistence (still used)

## Performance Considerations

### Polling Frequency

- Sensor values: Every 5 seconds (configurable)
- Historical data: Every 60 seconds on demand
- Alarms: Every 10 seconds

Adjust in components as needed for your latency requirements.

### Caching

Frontend caches:
- Machine list (until refresh)
- Sensor definitions (until refresh)
- Board layouts (in IndexedDB/localStorage)

Backend caches:
- Sensor values (latest only, in memory)
- MQTT topics (on startup)

### WebSocket for Real-time

For low-latency updates, connect to `/ws/realtime` endpoint:

```typescript
const ws = scadaBackendService.connectWebSocket(
  (data) => console.log('Update:', data),
  (error) => console.error('Error:', error),
  () => console.log('Closed')
);

scadaBackendService.subscribeToSensorData(ws, ['sensor_code_1', 'sensor_code_2']);
```

## Next Steps

1. **Monitor Logs**: Watch docker-compose logs for any errors
2. **Test All Pages**: Verify boards, machines, alarms work
3. **Configure Machines**: Ensure your machines are properly configured in YAML
4. **Set Up Alerts**: Create alarms in machine YAML configuration
5. **Monitor Performance**: Check browser DevTools for network performance

---

**Integration Complete** ✅

The frontend now fully integrates with the real backend. All YAML configuration, database schemas, and API endpoints are ready to use.
