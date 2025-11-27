# Estructura de Configuración de Máquinas - sec21.yml como Ejemplo

## Resumen de Cambios Realizados

El archivo `config/machines/sec21.yml` ha sido restructurado como referencia global para todos los archivos de configuración de máquinas.

## Nueva Estructura

### 1. **ESTADO PRINCIPAL DE LA MÁQUINA** (Visible y Crítico)

```yaml
machine_status:
- code: secadero_21_on      # Patrón: secadero_XX_on
  name: Secadero 21 ON
  type: boolean
  unit: ''
  address: 78
  function_code: 1
  display_format: boolean
  critical: true             # Marca como crítica para la UI
  color_off: '#FF0000'      # Rojo cuando está OFF
  color_on: '#00FF00'       # Verde cuando está ON
```

**Uso global:**
- Reemplazar `21` con el número de máquina correspondiente
- Patrón: `secadero_XX_on` donde XX = número de máquina
- Este sensor debe mostrarse **arriba y visible** en la interfaz
- Cuando está en OFF, mostrar en **ROJO**

---

### 2. **SENSORES OPERACIONALES**

Sección para sensores de medición normales (temperatura, humedad, velocidad, etc.):

```yaml
sensors:
- code: temperatura_medida_sec21
  name: Temperatura Medida SEC21
  type: temperature
  unit: °C
  address: 866
  function_code: 3
  scale_factor: 1.0
  offset: 0.0
  data_type: uint16
  # ... más sensores operacionales
```

---

### 3. **ALARMAS Y FALLAS** (Nuevas en BD con Timestamps)

```yaml
alarms:
- code: falla_variador_sec21           # Patrón: falla_variador_secXX
  name: Falla Variador SEC21
  type: boolean
  unit: ''
  address: 53
  function_code: 1
  display_format: boolean
  is_alarm: true                       # Identificador de alarma
  severity: high                       # high, critical, medium
  color: '#FF0000'                     # Rojo cuando está activa
  store_in_db: true                    # Guardar en BD
  timestamp_on: true                   # Guardar fecha/hora de activación
  timestamp_off: true                  # Guardar fecha/hora de desactivación

- code: falla_sensor_temperatura_sec21  # Patrón: falla_sensor_temperatura_secXX
  name: Falla Sensor Temperatura SEC21
  # ... estructura igual
  
- code: falla_sensor_humedad_sec21     # Patrón: falla_sensor_humedad_secXX
  name: Falla Sensor Humedad SEC21
  # ... estructura igual
  
- code: paro_emergencia_secaderos_21_24 # Patrón: paro_emergencia_secadores_XX_YY
  name: Paro Emergencia Secaderos 21-24
  severity: critical
  # ... estructura igual
```

## Patrones de Nomenclatura Global

### Sensores ON/OFF de Máquina:
```
secadero_XX_on      → XX = número de secadero (21, 22, 23, etc.)
```

### Fallas (Cambiar nombre específico según tipo):
```
falla_variador_secXX              → Falla del variador
falla_sensor_temperatura_secXX    → Falla sensor de temperatura
falla_sensor_humedad_secXX        → Falla sensor de humedad
paro_emergencia_secadores_XX_YY   → Paro de emergencia (rango de máquinas)
```

## Implementación en Base de Datos

Para cada alarma con `store_in_db: true`, se debe guardar:

### Tabla: `machine_alarms`
```
id (PK)
machine_code         → secadero_21 (o sec21)
alarm_code          → falla_variador_sec21
alarm_name          → Falla Variador SEC21
severity            → high / critical
status              → 1 (activa) / 0 (inactiva)
timestamp_on        → Fecha/hora de activación
timestamp_off       → Fecha/hora de desactivación (NULL si sigue activa)
created_at          → Timestamp de registro en BD
updated_at          → Último update
```

## Cómo Aplicar Globalmente

1. **Para cada máquina (sec21.yml, sec22.yml, sec23.yml, etc.):**
   - Mover su sensor ON/OFF a sección `machine_status` al inicio
   - Reorganizar fallas a sección `alarms`
   - Usar patrones de nomenclatura: `secXX_on`, `falla_variador_secXX`, etc.

2. **En el código del collector:**
   - Detectar sensores con `is_alarm: true`
   - Guardar en tabla `machine_alarms` cuando el valor cambie
   - Registrar `timestamp_on` cuando pasa de 0→1
   - Registrar `timestamp_off` cuando pasa de 1→0

3. **En la API:**
   - Crear endpoints para obtener alarmas activas
   - Endpoint para obtener historial de alarmas con timestamps
   - Filtrar por máquina, severidad, fecha

4. **En la UI:**
   - Mostrar `machine_status` al tope (verde/rojo según ON/OFF)
   - Mostrar alarmas activas en sección destacada en rojo
   - Mostrar historial de alarmas en tabla con timestamps

## Ejemplo de Uso en sec22.yml

```yaml
machine:
  code: sec22
  name: Secadora 22
plc:
  code: sec22_plc
  name: PLC Secadora 22
  protocol: modbus_tcp
  ip_address: 192.168.72.12
  port: 502
  unit_id: 1
  poll_interval_s: 1
  enabled: true

machine_status:
- code: secadero_22_on           # ← Cambiar 21 por 22
  name: Secadero 22 ON            # ← Cambiar 21 por 22
  # ... resto igual
  
sensors:
- code: temperatura_medida_sec22  # ← Cambiar 21 por 22
  # ... resto igual
  
alarms:
- code: falla_variador_sec22      # ← Cambiar 21 por 22
  name: Falla Variador SEC22      # ← Cambiar 21 por 22
  # ... resto igual
```

---

**Archivo de referencia actualizado:** `/root/plc-backend/config/machines/sec21.yml`
