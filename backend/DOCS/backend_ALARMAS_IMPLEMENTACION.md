# Implementación de Sistema de Alarmas - Documentación Técnica

## Resumen de Cambios

Se ha implementado un sistema completo de gestión de alarmas con:
- ✅ Detección automática de fallos en máquinas
- ✅ Almacenamiento en BD con timestamps de activación/desactivación
- ✅ Página de alarmas interactiva con historial
- ✅ Detalle de máquina con estado ON/OFF visible y alarmas activas
- ✅ Endpoints API para consultar alarmas activas e historial

---

## 1. CAMBIOS EN BASE DE DATOS

### Nuevo Modelo: `MachineAlarm` (api/models.py)

Tabla para almacenar eventos de alarma:

```python
class MachineAlarm(Base):
    __tablename__ = "machine_alarms"
    
    id: int (PK)
    machine_id: int (FK -> machines.id)
    sensor_id: int (FK -> sensors.id)
    alarm_code: str  # falla_variador_sec21
    alarm_name: str  # Falla Variador SEC21
    severity: str    # high, critical, medium, low
    status: int      # 1=activa, 0=inactiva
    color: str       # #FF0000 (color visualización)
    timestamp_on: datetime   # Cuándo se activó
    timestamp_off: datetime  # Cuándo se desactivó (NULL si activa)
    created_at: datetime
    updated_at: datetime
```

**Índices:**
- `machine_id` (para filtrar por máquina)
- `sensor_id` (para asociar con sensor)
- `alarm_code` (para búsqueda rápida)
- `status` (para filtrar activas/inactivas)
- `created_at` (para ordenar por tiempo)

---

## 2. SCHEMAS PYDANTIC (api/schemas.py)

Se agregaron 3 nuevos schemas para serialización:

### MachineAlarmBase
Base con campos comunes de alarma.

### MachineAlarm
Schema completo para GET/POST/PATCH operations.

### MachineAlarmResponse
Extiende MachineAlarm con datos relacionados (machine_name, sensor_name).

### MachineAlarmHistory
Optimizado para historial con campo `is_active` booleano.

---

## 3. API ENDPOINTS (api/main.py)

### GET `/api/alarms`
Obtiene todas las alarmas con filtros opcionales.

**Parámetros query:**
- `machine_code`: str (opcional)
- `severity`: str (opcional: high, critical, medium, low)
- `status`: int (opcional: 1=activa, 0=inactiva)
- `limit`: int (default: 100)
- `skip`: int (default: 0)

**Respuesta:** Lista de `MachineAlarmResponse`

```json
[
  {
    "id": 1,
    "alarm_code": "falla_variador_sec21",
    "alarm_name": "Falla Variador SEC21",
    "severity": "high",
    "color": "#FF0000",
    "machine_code": "sec21",
    "machine_name": "Secadora 21",
    "sensor_code": "falla_variador_sec21",
    "sensor_name": "Falla Variador SEC21",
    "status": 1,
    "timestamp_on": "2025-11-27T10:30:45Z",
    "timestamp_off": null,
    "created_at": "2025-11-27T10:30:45Z"
  }
]
```

### GET `/api/alarms/active`
Obtiene solo alarmas activas (status=1 y timestamp_off=NULL).

**Parámetros query:**
- `machine_code`: str (opcional)
- `severity`: str (opcional)

**Respuesta:** Lista de `MachineAlarmResponse` (solo activas)

### GET `/api/machines/{machine_id}/alarms`
Obtiene historial de alarmas de una máquina específica.

**Parámetros query:**
- `status`: int (opcional)
- `limit`: int (default: 100)
- `skip`: int (default: 0)

**Respuesta:** Lista de `MachineAlarmHistory`

### POST `/api/alarms`
Crear alarma manualmente (generalmente automático desde collector).

**Body:**
```json
{
  "machine_id": 1,
  "sensor_id": 5,
  "alarm_code": "falla_variador_sec21",
  "alarm_name": "Falla Variador SEC21",
  "severity": "high",
  "color": "#FF0000",
  "status": 1,
  "timestamp_on": "2025-11-27T10:30:45Z",
  "timestamp_off": null
}
```

### PATCH `/api/alarms/{alarm_id}`
Actualizar estado de alarma (desactivarla).

**Query parameters:**
- `status`: int (1 o 0)
- `timestamp_off`: datetime (opcional)

**Respuesta:** `MachineAlarm` actualizada

---

## 4. LÓGICA DE DETECCIÓN EN COLLECTOR (collector/main.py)

### Nueva Función: `handle_sensor_alarm()`

Se ejecuta después de procesar cada lectura de sensor para detectar transiciones de estado.

**Lógica:**
1. Revisar si `is_alarm: true` en configuración del sensor
2. Obtener valor anterior desde `SensorLastValue`
3. Detectar transición: 0→1 (activación) o 1→0 (desactivación)
4. Si activación: crear nuevo registro en `MachineAlarm` con `timestamp_on`
5. Si desactivación: cerrar alarma activa con `timestamp_off` y `status=0`

**Log ejemplos:**
```
🚨 ALARM TRIGGERED: Falla Variador SEC21 (sec21) at 2025-11-27T10:30:45Z
✅ ALARM CLEARED: Falla Variador SEC21 (sec21) at 2025-11-27T11:45:30Z
```

### Integración en loop principal
Se llama `handle_sensor_alarm()` después de actualizar `SensorLastValue` para cada sensor.

---

## 5. ESTRUCTURA DE ARCHIVOS CONFIG (sec21.yml)

### Sección `machine_status` (ARRIBA, bien visible)
```yaml
machine_status:
- code: secadero_21_on
  name: Secadero 21 ON
  type: boolean
  address: 78
  function_code: 1
  critical: true
  color_off: '#FF0000'  # Rojo cuando está OFF
  color_on: '#00FF00'   # Verde cuando está ON
```

### Sección `alarms` (NUEVA)
```yaml
alarms:
- code: falla_variador_sec21
  name: Falla Variador SEC21
  type: boolean
  address: 53
  function_code: 1
  is_alarm: true
  severity: high
  color: '#FF0000'
  store_in_db: true
  timestamp_on: true
  timestamp_off: true
```

---

## 6. UI - PÁGINAS HTML

### `/ui/alarms.html` - Centro de Alarmas

**Características:**
- Vista en tarjetas de alarmas activas (ROJAS)
- Historial de alarmas en tabla
- Filtros por máquina, severidad, estado
- Estadísticas: Alarmas Activas / Total
- Auto-actualización cada 5 segundos
- Duración de alarmas calculada automáticamente

**Secciones:**
1. **Header con estadísticas** - Muestra conteo de alarmas activas
2. **Filtros** - Machine, Severity, Status
3. **Tarjetas de Alarmas Activas** - En ROJO con pulsación
4. **Tabla de Historial** - Todas las alarmas con timestamps
5. **Footer** - Última actualización

### `/ui/machine-detail.html` - Detalle de Máquina

**Características:**
- **Banner de Estado (ARRIBA Y VISIBLE)**
  - Icono verde (🟢) cuando máquina está ON
  - Icono rojo (🔴) cuando máquina está OFF
  - Badge con estado ON/OFF pulsante
  - Color de fondo cambia según estado
  
- **Sensores Operacionales** - Grid de sensores con lecturas en vivo

- **Alarmas Activas** - Panel derecha con alarmas activas de esa máquina

- **Info de PLC** - Protocolo, dirección, puerto, estado

**Auto-actualización:** Cada 5 segundos

---

## 7. PATRONES DE NOMENCLATURA GLOBAL

Todos los archivos de máquinas (sec21.yml, sec22.yml, sec23.yml, etc.) deben seguir:

### Sensor ON/OFF de máquina:
```
secadero_XX_on     (XX = número de máquina)
```

### Fallas (en sección `alarms`):
```
falla_variador_secXX              → Falla del variador
falla_sensor_temperatura_secXX    → Falla sensor de temperatura
falla_sensor_humedad_secXX        → Falla sensor de humedad
paro_emergencia_secadores_XX_YY   → Paro de emergencia
```

---

## 8. FLUJO DE OPERACIÓN

### Secuencia de Eventos:

1. **Lectura de Sensor**
   - Collector lee sensor vía Modbus
   - Guarda valor en `SensorData` y `SensorLastValue`

2. **Detección de Alarma**
   - `handle_sensor_alarm()` detecta transición de estado
   - Si 0→1: **Crea alarma** con `timestamp_on = ahora`
   - Si 1→0: **Cierra alarma** con `timestamp_off = ahora`

3. **Persistencia en BD**
   - Alarma guardada en tabla `machine_alarms`
   - Timestamps precisos para auditoría

4. **UI se Actualiza**
   - `/api/alarms/active` retorna alarmas en vivo
   - Página de alarmas refresca cada 5 segundos
   - Detalle de máquina muestra alarmas activas
   - Estado ON/OFF de máquina visible en ROJO cuando está OFF

---

## 9. ESTRUCTURA DE DIRECTORIOS

```
/root/plc-backend/
├── api/
│   ├── models.py          (✅ +MachineAlarm)
│   ├── schemas.py         (✅ +MachineAlarm schemas)
│   ├── main.py            (✅ +4 endpoints de alarmas)
│   └── ...
├── collector/
│   ├── main.py            (✅ +handle_sensor_alarm, integración)
│   └── ...
├── config/
│   ├── machines/
│   │   ├── sec21.yml      (✅ Restructurado: machine_status + alarms)
│   │   ├── sec22.yml      (pendiente: aplicar patrón)
│   │   └── ...
│   └── settings.yml
├── ui/
│   ├── alarms.html        (✅ NUEVA: Centro de alarmas)
│   ├── machine-detail.html (✅ NUEVA: Detalle con ON/OFF)
│   └── ...
└── ...
```

---

## 10. PRÓXIMAS ACCIONES

### Inmediatas:
1. **Migraciones BD** - Ejecutar para crear tabla `machine_alarms`
   ```sql
   ALTER TABLE machines ADD COLUMN id SERIAL PRIMARY KEY;
   CREATE TABLE machine_alarms (...) AS definido en models.py;
   CREATE INDEX idx_machine_alarms_machine_id ON machine_alarms(machine_id);
   CREATE INDEX idx_machine_alarms_alarm_code ON machine_alarms(alarm_code);
   CREATE INDEX idx_machine_alarms_status ON machine_alarms(status);
   ```

2. **Copiar patrón a otras máquinas**
   - Aplicar estructura de `sec21.yml` a sec22.yml, sec23.yml, sec24.yml, etc.
   - Cambiar solo números y direcciones

3. **Servir archivos UI**
   - Configurar FastAPI para servir `/ui/` como archivos estáticos
   - O integrar en frontend existente

### Testing:
1. Simular falla activando/desactivando sensor de alarma
2. Verificar registro en BD con timestamps
3. Confirmar UI actualiza en tiempo real
4. Probar filtros de alarmas

### Mejoras Futuras:
- [ ] Notificaciones por email/SMS de alarmas críticas
- [ ] Dashboard de estadísticas de alarmas
- [ ] Exportar histórico a CSV
- [ ] Confirmación manual de alarmas reconocidas
- [ ] Integración con sistema de escalado (on-call)

---

## 11. REFERENCIAS

- **Archivo de configuración patrón:** `/root/plc-backend/config/machines/sec21.yml`
- **Template global:** `/root/plc-backend/CONFIG_MACHINES_TEMPLATE.md`
- **Páginas UI:** `/root/plc-backend/ui/alarms.html` y `/machine-detail.html`
