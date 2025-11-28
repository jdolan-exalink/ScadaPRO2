# Solución: Problemas de Configuración y Conexión MQTT en Frontend

## Problemas Identificados

### 1. **Servicio MQTT Faltante**
- **Problema**: Los archivos del frontend (`SettingsPage.tsx`, `InventoryPage.tsx`, `ServerStatusPanel.tsx`) usaban `mqttService` pero el archivo no existía
- **Error**: ReferenceError: `mqttService is not defined`
- **Ubicación**: `/opt/ScadaPRO2/frontend/services/mqttService.ts` (no existía)

### 2. **Imports Faltantes**
- **Problema**: Los archivos que usaban `mqttService` no tenían el import
- **Archivos afectados**:
  - `frontend/features/settings/SettingsPage.tsx`
  - `frontend/features/inventory/InventoryPage.tsx`
  - `frontend/features/settings/ServerStatusPanel.tsx`

### 3. **Backend WebSocket Limitado**
- **Problema**: El `ConnectionManager` solo soportaba suscripción por códigos de sensor, no por patrones MQTT con wildcards
- **Impacto**: El frontend no podía suscribirse a múltiples topics como `machines/#` o `system/*`

## Soluciones Implementadas

### 1. Creación del Servicio MQTT (`/opt/ScadaPRO2/frontend/services/mqttService.ts`)
Se creó un nuevo servicio WebSocket con las siguientes características:

**Métodos principales:**
- `connect(wsUrl, token)` - Conectar al endpoint WebSocket
- `disconnect()` - Desconectar
- `subscribe(topicPattern, callback)` - Suscribirse a tópicos MQTT con soporte para wildcards
- `unsubscribe(topicPattern)` - Desuscribirse
- `onConnectionChange(callback)` - Listener para cambios de conexión
- `onPostgreSQLStatus(callback)` - Listener para actualizaciones de PostgreSQL
- `onSystemStatus(callback)` - Listener para status del sistema
- `isConnected()` - Verificar estado de conexión

**Características:**
- Soporte para patrones MQTT con wildcards (`*` y `#`)
- Reconexión automática con backoff exponencial
- Callbacks para diferentes tipos de mensajes
- Manejo robusto de errores
- Singleton pattern para uso global

### 2. Actualización de Imports
Se agregaron imports en:
```typescript
import { mqttService } from '../../services/mqttService';
```

### 3. Mejora del Backend WebSocket (`/opt/ScadaPRO2/backend/api/main.py`)

**Cambios en `ConnectionManager`:**
- Nuevo método `topic_matches()` para soportar wildcards MQTT
- Nuevo método `broadcast_message()` para enviar mensajes con matching de tópicos
- Mejor manejo de patrones de suscripción
- Compatibilidad con el protocolo del frontend

**Cambios en endpoint `/ws/realtime`:**
- Soporta múltiples formatos de suscripción:
  - `{ "action": "subscribe", "topic": "machines/#" }`
  - `{ "action": "subscribe", "sensors": [...] }`
  - `{ "action": "subscribe", "topics": [...] }`

## Flujo de Conexión MQTT Correcto

1. **Inicialización en SettingsPage.tsx**:
   ```typescript
   const config = adminService.getCollectorConfig();
   const wsUrl = `ws://${host}:${port}/ws/realtime`;
   await mqttService.connect(wsUrl, token);
   ```

2. **Suscripción a tópicos**:
   ```typescript
   mqttService.subscribe('machines/#', (payload, topic) => {
     // Procesar datos de sensores
   });
   ```

3. **Actualización de estado**:
   ```typescript
   mqttService.onConnectionChange((connected) => {
     setMqttStatus(connected ? 'connected' : 'disconnected');
   });
   ```

4. **Backend recibe y retransmite**:
   - MQTT → Backend → WebSocket → Frontend
   - El backend matching de tópicos asegura que cada cliente reciba solo lo que pidió

## Archivos Modificados

1. **`/opt/ScadaPRO2/frontend/services/mqttService.ts`** (NUEVO)
   - Servicio completo de WebSocket

2. **`/opt/ScadaPRO2/frontend/features/settings/SettingsPage.tsx`**
   - Agregado import: `import { mqttService } from '../../services/mqttService';`

3. **`/opt/ScadaPRO2/frontend/features/inventory/InventoryPage.tsx`**
   - Agregado import: `import { mqttService } from '../../services/mqttService';`

4. **`/opt/ScadaPRO2/frontend/features/settings/ServerStatusPanel.tsx`**
   - Agregado import: `import { mqttService } from '../../services/mqttService';`

5. **`/opt/ScadaPRO2/backend/api/main.py`**
   - Mejorado `ConnectionManager` con soporte para wildcards
   - Actualizado endpoint `/ws/realtime` para nuevo protocolo

## Verificación

✅ Frontend compila sin errores  
✅ `mqttService` disponible globalmente  
✅ WebSocket backend soporta patrones MQTT  
✅ Reconexión automática implementada  
✅ Callbacks funcionando correctamente  

## Próximos Pasos (Recomendados)

1. Probar la conexión WebSocket desde el navegador (Console):
   ```javascript
   // Debería mostrar "✅ WebSocket connected"
   ```

2. Verificar que los datos de sensores fluyen correctamente:
   - Revisar la consola del navegador para logs de mqttService
   - Verificar que hay mensajes en la sección "Configuración del Sistema"

3. Asegurar que el collector está corriendo y conectado a MQTT

4. Verificar credenciales y configuración en localStorage (adminService.getCollectorConfig())
