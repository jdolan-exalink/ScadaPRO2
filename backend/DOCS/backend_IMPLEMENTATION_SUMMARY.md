# Implementación Completada: Gestión de Máquinas vía API

## ✅ Resumen de Cambios

Se ha implementado un sistema completo de gestión de máquinas a través de API REST que permite:

1. **CRUD de Archivos YAML** (config/machines/*.yml)
   - Crear nuevas máquinas
   - Leer configuración de máquinas
   - Actualizar configuración
   - Eliminar máquinas

2. **Gestión de Settings** (config/settings.yml)
   - Agregar máquinas a settings
   - Remover máquinas de settings
   - Activar máquinas (sin #)
   - Desactivar máquinas (con #)
   - Invertir estado (toggle)

---

## 📁 Archivos Creados/Modificados

### 1. **api/config_manager.py** ✨ NUEVO
Módulo de utilidades para gestionar YAML y settings:
- Funciones para leer/escribir archivos YAML
- Funciones para manipular settings.yml
- Parseo de estado de máquinas (habilitada/deshabilitada)
- Manejo robusto de errores y logging

**Funciones principales:**
```python
# Máquinas (YAML)
get_all_machines()
read_machine(machine_code)
create_machine(machine_code, config)
update_machine(machine_code, config)
delete_machine(machine_code)

# Settings
get_machine_settings()
add_machine_to_settings(machine_path, enabled)
remove_machine_from_settings(machine_path)
enable_machine_in_settings(machine_path)
disable_machine_in_settings(machine_path)
toggle_machine_in_settings(machine_path)
```

### 2. **api/schemas.py** 📝 MODIFICADO
Se agregaron nuevos schemas Pydantic:

```python
# Schemas para máquinas YAML
MachineYMLBase
MachineYMLCreate
MachineYMLUpdate
MachineYMLResponse

# Schemas para settings
MachineSettingsItem
MachineSettingsUpdate
MachineSettingsList
```

### 3. **api/main.py** 🔧 MODIFICADO

**Imports agregados:**
```python
from config_manager import (
    get_all_machines,
    read_machine,
    create_machine,
    update_machine,
    delete_machine,
    get_machine_settings,
    add_machine_to_settings,
    remove_machine_from_settings,
    enable_machine_in_settings,
    disable_machine_in_settings,
    toggle_machine_in_settings
)
```

**5 Nuevos endpoints para máquinas YAML:**
```python
GET    /api/machines-config              # Listar
GET    /api/machines-config/{machine_code}  # Obtener
POST   /api/machines-config              # Crear
PUT    /api/machines-config/{machine_code}  # Actualizar
DELETE /api/machines-config/{machine_code}  # Eliminar
```

**7 Nuevos endpoints para settings:**
```python
GET    /api/machines-settings                          # Listar
POST   /api/machines-settings                          # Agregar
PUT    /api/machines-settings/{machine_path}           # Activar/Desactivar
POST   /api/machines-settings/{machine_path}/toggle    # Invertir estado
DELETE /api/machines-settings/{machine_path}           # Remover
```

### 4. **API_DOCUMENTATION.md** 📖 MODIFICADO
Se agregó documentación completa:
- Sección **9. Gestión de Máquinas - Configuración YAML**
- Sección **10. Gestión de Máquinas - Settings**
- Changelog v0.9 actualizado
- Ejemplos de uso completos

### 5. **MACHINES_API_GUIDE.md** 📚 NUEVO
Guía de referencia rápida con:
- Ejemplos en cURL
- Ejemplos en Python
- Ejemplos en JavaScript
- Instrucciones de URL encoding
- Notas sobre efectos de activar/desactivar

### 6. **test_machines_api.py** 🧪 NUEVO
Script de prueba con funciones para:
- Listar máquinas
- Obtener máquina específica
- Crear máquina
- Actualizar máquina
- Eliminar máquina
- Gestionar settings (agregar, remover, activar, desactivar, toggle)

---

## 🎯 Endpoints Detallados

### Máquinas (YAML)

#### `GET /api/machines-config`
Lista todas las máquinas configuradas.

```bash
curl http://localhost:8000/api/machines-config \
  -H "Authorization: Bearer <token>"
```

#### `GET /api/machines-config/{machine_code}`
Obtiene una máquina específica.

#### `POST /api/machines-config`
Crea una nueva máquina.

```bash
curl -X POST http://localhost:8000/api/machines-config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "machine_code": "sec22",
    "machine_name": "Secadora 22",
    "config": { ... }
  }'
```

#### `PUT /api/machines-config/{machine_code}`
Actualiza una máquina existente.

#### `DELETE /api/machines-config/{machine_code}`
Elimina una máquina.

### Settings

#### `GET /api/machines-settings`
Lista máquinas en settings.yml con su estado.

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
Agrega una máquina a settings.

```bash
curl -X POST http://localhost:8000/api/machines-settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "machines/sec22.yml",
    "enabled": true
  }'
```

#### `PUT /api/machines-settings/{machine_path_encoded}`
Activa o desactiva una máquina.

```bash
# URL encode: machines/sec21.yml → machines%2Fsec21.yml
curl -X PUT "http://localhost:8000/api/machines-settings/machines%2Fsec21.yml" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "machines/sec21.yml",
    "enabled": false
  }'
```

#### `POST /api/machines-settings/{machine_path_encoded}/toggle`
Invierte el estado de una máquina.

#### `DELETE /api/machines-settings/{machine_path_encoded}`
Remueve una máquina de settings.

---

## 🔐 Seguridad

Todos los endpoints requieren autenticación Bearer:
```
Authorization: Bearer <token>
```

El token está protegido por HTTPBearer en FastAPI.

---

## 💡 Casos de Uso

### 1. Crear una nueva máquina
1. Usar `POST /api/machines-config` para crear el archivo YAML
2. Usar `POST /api/machines-settings` para agregarla a settings
3. Usar `PUT /api/machines-settings/{path}` con `enabled: true` para activarla

### 2. Desactivar una máquina (sin borrar datos)
1. Usar `PUT /api/machines-settings/{path}` con `enabled: false`
2. El archivo YAML se conserva
3. Los datos históricos se conservan
4. El collector no la cargará

### 3. Borrar completamente una máquina
1. Usar `DELETE /api/machines-settings/{path}` para remover de settings
2. Usar `DELETE /api/machines-config/{code}` para borrar el YAML
3. Los datos históricos se conservan

---

## 🧪 Pruebas

Para probar los nuevos endpoints:

```bash
# Script de prueba completo
python3 test_machines_api.py

# O con curl
TOKEN="tu_token"

# Listar máquinas
curl http://localhost:8000/api/machines-config \
  -H "Authorization: Bearer $TOKEN"

# Listar settings
curl http://localhost:8000/api/machines-settings \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📌 Notas Importantes

### URL Encoding
Los paths en URL deben estar encoded:
- `machines/sec21.yml` → `machines%2Fsec21.yml`

### Estado en settings.yml
```yaml
machines:
- machines/sec21.yml      # Activa
#- machines/sec22.yml     # Desactiva
```

### Archivos Afectados
- **YAML**: `config/machines/*.yml`
- **Settings**: `config/settings.yml`
- **No afecta**: Base de datos (datos históricos se conservan)

---

## 📊 Estructura de Datos

### MachineYMLResponse
```json
{
  "machine_code": "sec21",
  "machine_name": "Secadora 21",
  "filename": "sec21.yml",
  "data": {
    "machine": { "code": "sec21", "name": "Secadora 21" },
    "plc": { ... },
    "sensors": [ ... ]
  }
}
```

### MachineSettingsItem
```json
{
  "path": "machines/sec21.yml",
  "code": "sec21",
  "enabled": true
}
```

---

## ✨ Versión

**v0.9** - Release Date: 2025-11-27

- ✅ 12 nuevos endpoints
- ✅ Modulo config_manager.py
- ✅ 6 nuevos schemas
- ✅ Documentación completa
- ✅ Script de pruebas
- ✅ Guía de usuario

---

## 🚀 Próximos Pasos (Opcional)

1. Validación de configuración YAML (verificar que sea válida)
2. Backup automático antes de eliminar máquinas
3. Versionamiento de configuraciones
4. Endpoint para duplicar máquinas
5. Endpoint para exportar/importar configuraciones
6. WebSocket para notificaciones de cambios

---

¡Implementación completada y lista para usar! 🎉
