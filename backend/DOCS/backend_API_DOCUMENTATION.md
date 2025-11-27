# Documentación de API - Industrial IoT Backend

## Introducción

Esta API permite interactuar con el sistema de adquisición de datos industrial. Proporciona acceso a la configuración de máquinas, PLCs y sensores, así como a los datos históricos y en tiempo real.

**Base URL**: `http://<host>:8000` (Local: `http://localhost:8000`)

## Autenticación

La mayoría de los endpoints están protegidos y requieren un token JWT.
El token debe enviarse en el encabezado `Authorization`.

```http
Authorization: Bearer <tu_token_jwt>
```

> **Nota**: Actualmente, la validación de token es básica. Asegúrese de configurar `JWT_SECRET` en el entorno de producción.

## Endpoints REST

### 1. Estado del Sistema

#### `GET /api/health`
Verifica si el servicio está funcionando.
- **Auth**: No requerida.
- **Respuesta**:
  ```json
  { "status": "ok" }
  ```

#### `GET /api/version`
Obtiene la versión actual del backend.
- **Auth**: No requerida.
- **Respuesta**:
  ```json
  { "version": "0.8" }
  ```

### 2. Máquinas

#### `GET /api/machines`
Lista todas las máquinas configuradas.
- **Respuesta**:
  ```json
  [
    {
      "id": 1,
      "code": "sec21",
      "name": "Secadora 21",
      "description": "Secadora principal de la línea 2",
      "created_at": "2025-11-24T12:00:00Z",
      "updated_at": null
    }
  ]
  ```

#### `GET /api/machines/{machine_id}`
Obtiene detalles de una máquina específica.

### 3. PLCs

#### `GET /api/plcs`
Lista todos los PLCs configurados.
- **Respuesta**:
  ```json
  [
    {
      "id": 1,
      "machine_id": 1,
      "code": "plc_sec21",
      "name": "PLC Principal",
      "protocol": "modbus_tcp",
      "ip_address": "192.168.1.10",
      "port": 502,
      "unit_id": 1,
      "poll_interval_s": 1,
      "enabled": true,
      "created_at": "2025-11-24T12:00:00Z",
      "updated_at": null
    }
  ]
  ```

#### `GET /api/plcs/{plc_id}`
Obtiene detalles de un PLC específico.

#### `PATCH /api/plcs/{plc_id}`
Actualiza la configuración de un PLC (ej. activar/desactivar).
- **Body**:
  ```json
  {
    "enabled": false,
    "poll_interval_s": 2
  }
  ```
- **Respuesta**: Objeto PLC actualizado.

### 3. Sensores

#### `GET /api/sensors`
Lista sensores. Permite filtros por query params.
- **Parámetros (Opcionales)**:
  - `machine_code`: Filtrar por código de máquina (ej: `sec21`).
  - `plc_code`: Filtrar por código de PLC.
  - `type`: Filtrar por tipo de sensor (ej: `temperature`, `rpm`).
- **Respuesta**:
  ```json
  [
    {
      "id": 1,
      "plc_id": 1,
      "code": "sec21_temp_01",
      "name": "Temperatura Entrada",
      "type": "temperature",
      "unit": "°C",
      "address": 100,
      "function_code": 3,
      "scale_factor": 0.1,
      "offset": 0.0,
      "data_type": "int16",
      "precision": 1,
      "swap": null,
      "is_discrete": false,
      "created_at": "2025-11-24T12:00:00Z",
      "updated_at": null
    }
  ]
  ```

#### `GET /api/sensors/{sensor_id}`
Obtiene detalles de un sensor.

#### `GET /api/sensors/{sensor_id}/history`
Obtiene datos históricos de un sensor.
- **Parámetros (Requeridos)**:
  - `from`: Fecha inicio (ISO 8601, ej: `2025-11-24T00:00:00Z`).
  - `to`: Fecha fin (ISO 8601).
- **Respuesta**:
  ```json
  [
    {
      "timestamp": "2025-11-24T12:00:00Z",
      "value": 65.5
    }
  ]
  ```

#### `GET /api/sensors/mqtt-topics`
Obtiene la lista completa de sensores con sus topics MQTT para integración con frontend.
- **Parámetros (Opcionales)**:
  - `machine_code`: Filtrar por código de máquina (ej: `sec21`).
  - `type`: Filtrar por tipo de sensor (ej: `boolean`, `temperature`, `program`).
- **Respuesta**:
  ```json
  [
    {
      "id": 1,
      "code": "temperatura_medida_sec21",
      "name": "Temperatura Medida SEC21",
      "type": "temperature",
      "unit": "°C",
      "display_format": null,
      "value_map": null,
      "mqtt_topic": "machines/sec21/sec21_plc/temperatura_medida_sec21",
      "machine_code": "sec21",
      "machine_name": "Secadora 21",
      "plc_code": "sec21_plc"
    },
    {
      "id": 9,
      "code": "programa_sec21",
      "name": "Programa SEC21",
      "type": "program",
      "unit": "",
      "display_format": "mapped",
      "value_map": {
        "1": "Milan Economico",
        "2": "Eco/Crespo Cant",
        "3": "Milan Normal",
        "4": "Salamines",
        "5": "Bondiola",
        "6": "Camaras"
      },
      "mqtt_topic": "machines/sec21/sec21_plc/programa_sec21",
      "machine_code": "sec21",
      "machine_name": "Secadora 21",
      "plc_code": "sec21_plc"
    }
  ]
  ```

### 4. Exportación

#### `GET /api/export/configuration`
Obtiene un listado completo de activos (máquinas) y sensores configurados, ideal para sincronización o configuración de clientes.
- **Respuesta**:
  ```json
  {
    "assets": [
      {
        "id": 1,
        "code": "sec21",
        "name": "Secadora 21",
        "description": "...",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "sensors": [
      {
        "id": 1,
        "code": "sec21_temp_01",
        "name": "Temperatura Entrada",
        "type": "temperature",
        "unit": "°C",
        ...
      }
    ]
  }
  ```

### 5. Logs del Sistema

#### `GET /api/logs`
Obtiene el historial de logs del sistema (errores, advertencias, eventos).
- **Parámetros (Opcionales)**:
  - `level`: Filtrar por nivel (`INFO`, `WARNING`, `ERROR`).
  - `source`: Filtrar por origen (`SYSTEM`, `API`, `COLLECTOR`).
  - `limit`: Cantidad de registros a devolver (default: 100).
  - `skip`: Paginación (default: 0).
- **Respuesta**:
  ```json
  [
    {
      "id": 1,
      "timestamp": "2025-11-24T20:53:15.122Z",
      "level": "INFO",
      "source": "SYSTEM",
      "message": "Backend started successfully",
      "details": null
    }
  ]
  ```

### 6. Administración de Configuración

#### `GET /api/admin/machines-config`
Obtiene el listado de archivos de configuración de máquinas (`settings.yml`) y su estado (habilitado/deshabilitado).
- **Respuesta**:
  ```json
  [
    {
      "filename": "sec4.yml",
      "enabled": true
    },
    {
      "filename": "bombo1.yml",
      "enabled": false
    }
  ]
  ```

#### `POST /api/admin/machines-config`
Actualiza el estado de los archivos de configuración de máquinas. Permite habilitar o deshabilitar la carga de configuraciones específicas.
- **Body**:
  ```json
  {
    "files": [
      { "filename": "sec4.yml", "enabled": true },
      { "filename": "bombo1.yml", "enabled": true }
    ]
  }
  ```
- **Respuesta**:
  ```json
  {
    "status": "ok",
    "message": "Configuration updated. You may need to restart the collector."
  }
  ```

### 7. Alarmas (Nuevo en v0.8)

#### `GET /api/alarms`
Obtiene todas las alarmas registradas con filtros opcionales.
- **Parámetros Query**:
  - `machine_code`: Filtrar por código de máquina (ej: "sec21")
  - `severity`: Filtrar por severidad ("high", "critical", "medium", "low")
  - `status`: Filtrar por estado (1=activa, 0=inactiva)
  - `limit`: Cantidad máxima de resultados (default: 100)
  - `skip`: Paginación (default: 0)
- **Respuesta**:
  ```json
  [
    {
      "id": 1,
      "alarm_code": "VARIADOR_FAIL",
      "alarm_name": "Falla en Variador",
      "severity": "critical",
      "color": "#FF0000",
      "machine_id": 1,
      "sensor_id": null,
      "status": 1,
      "timestamp_on": "2025-11-27T15:06:12.760315Z",
      "timestamp_off": null,
      "created_at": "2025-11-27T15:06:12.761335Z",
      "updated_at": null,
      "machine_code": "sec21",
      "machine_name": "Secadora 21",
      "sensor_code": null,
      "sensor_name": null
    }
  ]
  ```

#### `GET /api/alarms/active`
Obtiene solo las alarmas activas (status=1 y timestamp_off es NULL).
- **Parámetros Query**:
  - `machine_code`: Filtrar por máquina
  - `severity`: Filtrar por severidad
- **Respuesta**: Array con mismo formato que `/api/alarms`

#### `GET /api/machines/{machine_id}/alarms`
Obtiene el historial de alarmas de una máquina específica.
- **Parámetros Path**:
  - `machine_id`: ID de la máquina
- **Respuesta**:
  ```json
  [
    {
      "id": 1,
      "alarm_code": "TEMP_HIGH",
      "alarm_name": "Temperatura Alta",
      "severity": "high",
      "timestamp_on": "2025-11-27T14:30:00Z",
      "timestamp_off": "2025-11-27T14:45:00Z",
      "is_active": false
    }
  ]
  ```

#### `POST /api/alarms`
Crea una nueva alarma manualmente.
- **Body**:
  ```json
  {
    "machine_id": 1,
    "alarm_code": "MOTOR_OVERTEMP",
    "alarm_name": "Motor Sobrecalentado",
    "severity": "critical",
    "color": "#FF0000",
    "sensor_id": null
  }
  ```
- **Respuesta**: Objeto alarma creada con ID asignado

#### `PATCH /api/alarms/{alarm_id}`
Actualiza el estado de una alarma (desactivarla).
- **Parámetros Query**:
  - `status`: Nuevo estado (0 para desactivar)
  - `timestamp_off`: Timestamp de desactivación (se genera automáticamente si no se proporciona)
- **Respuesta**: Objeto alarma actualizado

### 8. Gestión de Máquinas - Configuración YAML (Nuevo en v0.9)

#### `GET /api/machines-config`
Obtiene la lista de todas las máquinas configuradas (archivos YML en `config/machines/`).
- **Respuesta**:
  ```json
  [
    {
      "machine_code": "sec21",
      "machine_name": "Secadora 21",
      "filename": "sec21.yml",
      "data": {
        "machine": {
          "code": "sec21",
          "name": "Secadora 21"
        },
        "plc": {...},
        "sensors": [...]
      }
    }
  ]
  ```

#### `GET /api/machines-config/{machine_code}`
Obtiene la configuración completa de una máquina específica.
- **Parámetros**:
  - `machine_code`: Código de la máquina (ej: "sec21")
- **Respuesta**: Objeto `MachineYMLResponse` con la configuración completa

#### `POST /api/machines-config`
Crea una nueva máquina (crea un archivo YML en `config/machines/`).
- **Body**:
  ```json
  {
    "machine_code": "sec22",
    "machine_name": "Secadora 22",
    "config": {
      "machine": {
        "code": "sec22",
        "name": "Secadora 22"
      },
      "plc": {
        "code": "sec22_plc",
        "name": "PLC Secadora 22",
        "protocol": "modbus_tcp",
        "ip_address": "192.168.72.12",
        "port": 502,
        "unit_id": 1,
        "poll_interval_s": 1,
        "enabled": true
      },
      "sensors": []
    }
  }
  ```
- **Respuesta**: La máquina creada
- **Errores**:
  - `409 Conflict`: La máquina ya existe

#### `PUT /api/machines-config/{machine_code}`
Actualiza la configuración de una máquina existente.
- **Parámetros**:
  - `machine_code`: Código de la máquina a actualizar
- **Body**: Objeto con la configuración actualizada (mismo formato que POST)
- **Respuesta**: La máquina actualizada
- **Errores**:
  - `404 Not Found`: La máquina no existe

#### `DELETE /api/machines-config/{machine_code}`
Elimina una máquina (borra el archivo YML).
- **Parámetros**:
  - `machine_code`: Código de la máquina a eliminar
- **Respuesta**:
  ```json
  {
    "message": "Machine 'sec22' deleted successfully"
  }
  ```
- **Errores**:
  - `404 Not Found`: La máquina no existe

### 9. Gestión de Máquinas - Settings (Nuevo en v0.9)

#### `GET /api/machines-settings`
Obtiene la lista de máquinas definidas en `settings.yml` con su estado (habilitada/deshabilitada).
- **Respuesta**:
  ```json
  {
    "machines": [
      {
        "path": "machines/sec21.yml",
        "code": "sec21",
        "enabled": true
      },
      {
        "path": "machines/sec22.yml",
        "code": "sec22",
        "enabled": false
      }
    ]
  }
  ```

#### `POST /api/machines-settings`
Agrega una máquina a la lista de `settings.yml`.
- **Body**:
  ```json
  {
    "path": "machines/sec22.yml",
    "enabled": true
  }
  ```
- **Respuesta**:
  ```json
  {
    "message": "Machine 'machines/sec22.yml' added successfully",
    "enabled": true
  }
  ```
- **Errores**:
  - `409 Conflict`: La máquina ya está en settings.yml

#### `PUT /api/machines-settings/{machine_path_encoded}`
Activa o desactiva una máquina en `settings.yml`.
- **Parámetros**:
  - `machine_path_encoded`: Path con `/` codificado como `%2F` (ej: `machines%2Fsec21.yml`)
- **Body**:
  ```json
  {
    "path": "machines/sec21.yml",
    "enabled": false
  }
  ```
- **Respuesta**:
  ```json
  {
    "message": "Machine 'machines/sec21.yml' updated successfully",
    "enabled": false
  }
  ```
- **Nota**: Desactivar una máquina agrega un `#` al principio de su línea en settings.yml

#### `POST /api/machines-settings/{machine_path_encoded}/toggle`
Invierte el estado (habilitada/deshabilitada) de una máquina.
- **Parámetros**:
  - `machine_path_encoded`: Path con `/` codificado como `%2F`
- **Respuesta**:
  ```json
  {
    "message": "Machine 'machines/sec21.yml' toggled successfully",
    "enabled": true
  }
  ```

#### `DELETE /api/machines-settings/{machine_path_encoded}`
Remueve una máquina de `settings.yml`.
- **Parámetros**:
  - `machine_path_encoded`: Path con `/` codificado como `%2F`
- **Respuesta**:
  ```json
  {
    "message": "Machine 'machines/sec21.yml' removed from settings successfully"
  }
  ```
- **Errores**:
  - `404 Not Found`: La máquina no está en settings.yml

**Notas sobre URL encoding**:
- Los paths deben estar URL-encoded en la URL
- Ejemplo: `/api/machines-settings/machines%2Fsec21.yml`
- En JavaScript: `encodeURIComponent("machines/sec21.yml")` → `"machines%2Fsec21.yml"`
- En Python: `urllib.parse.quote("machines/sec21.yml", safe='')` → `"machines%2Fsec21.yml"`

## WebSocket (Tiempo Real)

El backend expone un canal WebSocket para recibir actualizaciones en vivo de los sensores.

**URL**: `ws://<host>:8000/ws/realtime`

### Protocolo

1. **Conexión**: Establecer conexión WebSocket.
2. **Suscripción**: Enviar un mensaje JSON para suscribirse a sensores específicos.
   ```json
   {
     "action": "subscribe",
     "sensors": ["sec21_temp_01", "sec21_rpm_01"]
   }
   ```
3. **Recepción de Datos**: El servidor enviará mensajes cuando lleguen nuevos datos de los sensores suscritos.
   ```json
   {
     "type": "measurement",
     "sensor_code": "sec21_temp_01",
     "timestamp": "2025-11-24T12:00:05.123Z",
     "value": 65.5,
     "unit": "°C"
   }
   ```

### Ejemplo de Implementación (JavaScript)

```javascript
const socket = new WebSocket('ws://localhost:8000/ws/realtime');

socket.onopen = function(e) {
  console.log("[open] Conexión establecida");
  
  // Suscribirse a sensores específicos
  const subscriptionMessage = {
    action: "subscribe",
    sensors: ["sec4_temp_01", "sec4_rpm_01"]
  };
  socket.send(JSON.stringify(subscriptionMessage));
};

socket.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log(`[message] Datos recibidos del sensor ${data.sensor_code}: ${data.value} ${data.unit}`);
  // Actualizar UI aquí
};

socket.onclose = function(event) {
  if (event.wasClean) {
    console.log(`[close] Conexión cerrada limpiamente, código=${event.code} motivo=${event.reason}`);
  } else {
    console.log('[close] La conexión se cayó');
  }
};

socket.onerror = function(error) {
  console.log(`[error] ${error.message}`);
};
```

### Ejemplo de Implementación (Python - websockets)

```python
import asyncio
import websockets
import json

async def listen():
    uri = "ws://localhost:8000/ws/realtime"
    async with websockets.connect(uri) as websocket:
        # Suscribirse
        await websocket.send(json.dumps({
            "action": "subscribe",
            "sensors": ["sec4_temp_01"]
        }))
        
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            print(f"Recibido: {data}")

if __name__ == "__main__":
    asyncio.run(listen())
```

## Swagger UI

Para probar la API interactivamente, puede acceder a la documentación generada automáticamente por FastAPI en:

`http://localhost:8000/docs`

## MQTT Topics del Sistema

El collector publica información del estado del sistema y métricas de rendimiento en topics MQTT específicos. Todos los mensajes de estado usan `retain=true` para que los nuevos suscriptores reciban el último estado inmediatamente.

### Topics Disponibles

#### `system/status`
Estado completo del sistema, publicado cada 30 segundos.
```json
{
  "timestamp": "2025-11-25T10:30:00Z",
  "collector": {
    "status": "online",
    "stats": {
      "records_saved": 15420,
      "records_failed": 0,
      "avg_write_time_ms": 2.35,
      "last_write_time_ms": 1.8,
      "write_operations": 5140,
      "last_error": null,
      "uptime_seconds": 3600
    }
  },
  "postgresql": {
    "status": "online",
    "connections": {
      "total": 5,
      "active": 2,
      "idle": 3
    },
    "database_size": {
      "bytes": 52428800,
      "mb": 50.0,
      "gb": 0.0488
    },
    "tables": {
      "sensor_data": 15420,
      "sensors": 30,
      "plcs": 3,
      "machines": 3
    },
    "performance": {
      "total_inserts": 15420,
      "total_updates": 5140,
      "total_deletes": 0,
      "cache_hit_ratio": 99.5
    }
  },
  "mqtt": {
    "status": "online",
    "host": "mqtt",
    "port": 1883
  }
}
```

#### `system/postgresql`
Solo estadísticas de PostgreSQL.
```json
{
  "status": "online",
  "connections": { "total": 5, "active": 2, "idle": 3 },
  "database_size": { "bytes": 52428800, "mb": 50.0, "gb": 0.0488 },
  "tables": { "sensor_data": 15420, "sensors": 30 },
  "performance": {
    "total_inserts": 15420,
    "cache_hit_ratio": 99.5
  }
}
```

#### `system/collector`
Solo estadísticas del collector de datos.
```json
{
  "records_saved": 15420,
  "records_failed": 0,
  "avg_write_time_ms": 2.35,
  "last_write_time_ms": 1.8,
  "write_operations": 5140,
  "last_error": null,
  "uptime_seconds": 3600
}
```

#### `plc/{machine_code}/{plc_code}/{sensor_code}`
Datos de sensores en tiempo real.
```json
{
  "sensor_code": "temperatura_ducto_medida_sec4",
  "timestamp": "2025-11-25T10:30:01.123Z",
  "value": 65.5,
  "raw_value": 655,
  "quality": 0,
  "unit": "°C",
  "machine": "sec4",
  "plc": "sec4_plc"
}
```

### Ejemplo de Suscripción MQTT (Python)

```python
import paho.mqtt.client as mqtt
import json

def on_connect(client, userdata, flags, rc):
    print(f"Conectado con código: {rc}")
    # Suscribirse a todos los topics del sistema
    client.subscribe("system/#")
    # O suscribirse a datos de sensores específicos
    client.subscribe("machines/sec4/#")

def on_message(client, userdata, msg):
    data = json.loads(msg.payload.decode())
    print(f"Topic: {msg.topic}")
    print(f"Data: {json.dumps(data, indent=2)}")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.connect("localhost", 1883, 60)
client.loop_forever()
```

## Configuración de Máquinas

Las máquinas se configuran en el archivo `config/settings.yml`. Para habilitar o deshabilitar una máquina, se usa el prefijo `#`:

```yaml
machines:
- sec21.yml        # Habilitada (se monitorea)
#- sec22.yml       # Deshabilitada (comentada)
#- bombo1.yml      # Deshabilitada (comentada)
```

Al reiniciar el collector:
- Las máquinas **habilitadas** se sincronizan con la base de datos
- Las máquinas **deshabilitadas** (con `#`) se eliminan de la base de datos junto con sus PLCs, sensores y datos históricos

## Changelog

### v0.9 (2025-11-27)
- **Nuevo**: 8 endpoints REST para gestión de archivos de configuración de máquinas (CRUD):
  - `GET /api/machines-config` - Listar todas las máquinas configuradas
  - `GET /api/machines-config/{machine_code}` - Obtener configuración de máquina específica
  - `POST /api/machines-config` - Crear nueva máquina (archivo YML)
  - `PUT /api/machines-config/{machine_code}` - Actualizar configuración de máquina
  - `DELETE /api/machines-config/{machine_code}` - Eliminar máquina
- **Nuevo**: 4 endpoints REST para gestión de máquinas en settings.yml:
  - `GET /api/machines-settings` - Listar máquinas en settings.yml con estado (habilitada/deshabilitada)
  - `POST /api/machines-settings` - Agregar máquina a settings.yml
  - `PUT /api/machines-settings/{machine_path_encoded}` - Activar/desactivar máquina
  - `POST /api/machines-settings/{machine_path_encoded}/toggle` - Invertir estado de máquina
  - `DELETE /api/machines-settings/{machine_path_encoded}` - Remover máquina de settings.yml
- **Nuevo**: Módulo `config_manager.py` con funciones para gestionar YAML y settings
- **Nuevo**: Schemas Pydantic `MachineYMLBase`, `MachineYMLCreate`, `MachineYMLResponse`, etc.
- **Nuevo**: Soporte para URL encoding en rutas con parámetros (ej: `machines%2Fsec21.yml`)
- **Mejorado**: Documentación con ejemplos completos de uso de los nuevos endpoints

### v0.8 (2025-11-27)
- **Nuevo**: Sistema completo de alarmas (machine_alarms)
- **Nuevo**: 5 endpoints REST para gestión de alarmas:
  - `GET /api/alarms` - Obtener todas las alarmas con filtros opcionales
  - `GET /api/alarms/active` - Solo alarmas activas (status=1, timestamp_off=NULL)
  - `GET /api/machines/{machine_id}/alarms` - Alarmas por máquina
  - `POST /api/alarms` - Crear alarma manualmente
  - `PATCH /api/alarms/{alarm_id}` - Actualizar estado/desactivar alarma
- **Nuevo**: Tabla `machine_alarms` en PostgreSQL con índices optimizados
- **Nuevo**: Modelos SQLAlchemy MachineAlarm con relaciones a Machine y Sensor
- **Nuevo**: Schemas Pydantic para validación de alarmas
- **Nuevo**: Soporte para alarmas sin sensor específico (sensor_id nullable)
- **Nuevo**: Campos timestamp_on/timestamp_off para auditoría de alarmas
- **Nuevo**: Severity levels (high, critical, medium, low) con colores asociados
- **Mejorado**: LEFT JOINs en queries para manejar relaciones nullable
- **Mejorado**: Response models incluyen información de máquina y sensor

### v0.7.2 (2025-11-26)
- **Fix**: Manejo robusto de errores de conexión a base de datos en collector
- **Fix**: SQLAlchemy session rollback automático en errores de DB
- **Fix**: MQTT Client actualizado a CallbackAPIVersion.VERSION2 (elimina deprecation warning)
- **Mejorado**: Pool de conexiones PostgreSQL con `pool_pre_ping=True` para reconexión automática
- **Mejorado**: Configuración de pool: `pool_recycle=3600`, `pool_size=5`, `max_overflow=10`
- **Mejorado**: Errores de DB no bloquean el ciclo de polling, se reintentan en siguiente iteración

### v0.7.1 (2025-11-26)
- **Nuevo**: Endpoint `/api/sensors/mqtt-topics` para obtener sensores con topics MQTT
- **Nuevo**: Schema `SensorWithMQTT` con información completa para integración frontend
- **Nuevo**: Filtros por `machine_code` y `type` en endpoint mqtt-topics
- **Nuevo**: Incluye `value_map` en respuesta para sensores tipo program
- **Mejorado**: Query SQLAlchemy optimizada con joins explícitos

### v0.7.0 (2025-11-26)
- **Nuevo**: Soporte para sensores tipo `program` con mapeo de valores (`value_map`)
- **Nuevo**: `display_format: mapped` para mostrar nombres descriptivos en lugar de números
- **Nuevo**: Campo `display_value` en payload MQTT con el valor formateado/mapeado
- **Nuevo**: Banner de versión al arrancar API y Collector (`🚀 Industrial IoT v0.7.0`)
- **Nuevo**: Constante VERSION centralizada en ambos servicios
- **Mejorado**: Soporte para `swap: word` en registros uint32 (fix tiempo SEC21)
- **Mejorado**: Metadata del sensor almacena `value_map` para programas configurables

### v0.6.0 (2025-11-26)
- **Nuevo**: Soporte para sensores booleanos con `display_format: boolean`
- **Nuevo**: Visualización ON/OFF para sensores discretos en logs del collector
- **Nuevo**: Iconos dinámicos 🟢/🔴 para estados booleanos
- **Nuevo**: Campo `display_format` en modelo Sensor para personalizar visualización
- **Cambio**: Raíz de topics MQTT cambiada de `plc/` a `machines/`
- **Mejorado**: Configuración de SEC21 con 23 sensores booleanos correctamente tipados
- **Mejorado**: Sincronización de configuración actualiza `type` y `display_format` en sensores existentes

### v0.5.0 (2025-11-25)
- **Nuevo**: Publicación de estadísticas de PostgreSQL por MQTT (`system/postgresql`)
- **Nuevo**: Métricas de rendimiento del collector (`system/collector`, `system/status`)
- **Nuevo**: Monitoreo de tamaño de base de datos, conexiones activas y cache hit ratio
- **Nuevo**: Sincronización automática que elimina máquinas/PLCs/sensores no configurados
- **Mejorado**: Rastreo de tiempo de escritura y conteo de registros guardados

### v0.4.0 (2025-11-24)
- Sistema de logs persistentes en base de datos
- Endpoint `/api/logs` para consultar historial
- Endpoint `/api/admin/machines-config` para gestionar configuración
- Manejo mejorado de errores globales

### v0.3.0
- Soporte para múltiples tipos de datos (float32, uint32, int16)
- WebSocket para datos en tiempo real
- Configuración mediante archivos YAML
