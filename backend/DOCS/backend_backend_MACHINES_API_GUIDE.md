# API de Gestión de Máquinas - Guía de Uso

## 📋 Resumen

Se han agregado **12 nuevos endpoints REST** para gestionar máquinas:
- **5 endpoints** para gestionar archivos YAML de máquinas (CRUD)
- **7 endpoints** para gestionar la lista de máquinas en `settings.yml`

Versión: **v0.9**

---

## 🔧 1. Gestión de Archivos de Máquinas (YAML)

Los archivos de máquinas se encuentran en `config/machines/`.

### 1.1 Listar todas las máquinas

```bash
curl -X GET http://localhost:8000/api/machines-config \
  -H "Authorization: Bearer <token>"
```

**Respuesta:**
```json
[
  {
    "machine_code": "sec21",
    "machine_name": "Secadora 21",
    "filename": "sec21.yml",
    "data": { ... configuración completa ... }
  }
]
```

### 1.2 Obtener una máquina específica

```bash
curl -X GET http://localhost:8000/api/machines-config/sec21 \
  -H "Authorization: Bearer <token>"
```

### 1.3 Crear una nueva máquina

```bash
curl -X POST http://localhost:8000/api/machines-config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### 1.4 Actualizar una máquina

```bash
curl -X PUT http://localhost:8000/api/machines-config/sec22 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "config": { ... configuración actualizada ... }
  }'
```

### 1.5 Eliminar una máquina

```bash
curl -X DELETE http://localhost:8000/api/machines-config/sec22 \
  -H "Authorization: Bearer <token>"
```

---

## ⚙️ 2. Gestión de Settings (Activación/Desactivación)

El archivo `settings.yml` contiene la lista de máquinas activas/inactivas.

**Formato:**
```yaml
machines:
- machines/sec21.yml      # Activa (sin #)
#- machines/sec22.yml     # Desactiva (con #)
- machines/sec23.yml      # Activa
```

### 2.1 Listar máquinas en settings

```bash
curl -X GET http://localhost:8000/api/machines-settings \
  -H "Authorization: Bearer <token>"
```

**Respuesta:**
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

### 2.2 Agregar máquina a settings

```bash
curl -X POST http://localhost:8000/api/machines-settings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "machines/sec22.yml",
    "enabled": true
  }'
```

### 2.3 Activar/Desactivar una máquina

```bash
# Desactivar
curl -X PUT "http://localhost:8000/api/machines-settings/machines%2Fsec21.yml" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "machines/sec21.yml",
    "enabled": false
  }'

# Activar
curl -X PUT "http://localhost:8000/api/machines-settings/machines%2Fsec21.yml" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "machines/sec21.yml",
    "enabled": true
  }'
```

**Nota:** El path debe estar URL-encoded en la URL.
- `machines/sec21.yml` → `machines%2Fsec21.yml`

### 2.4 Invertir estado (toggle)

```bash
curl -X POST "http://localhost:8000/api/machines-settings/machines%2Fsec21.yml/toggle" \
  -H "Authorization: Bearer <token>"
```

### 2.5 Remover máquina de settings

```bash
curl -X DELETE "http://localhost:8000/api/machines-settings/machines%2Fsec21.yml" \
  -H "Authorization: Bearer <token>"
```

---

## 💻 Ejemplos en Python

### Listar máquinas

```python
import requests

TOKEN = "tu_token_aqui"
headers = {"Authorization": f"Bearer {TOKEN}"}

# Máquinas disponibles
response = requests.get("http://localhost:8000/api/machines-config", headers=headers)
machines = response.json()
for machine in machines:
    print(f"- {machine['code']}: {machine['machine_name']}")

# Máquinas en settings
response = requests.get("http://localhost:8000/api/machines-settings", headers=headers)
settings = response.json()
for machine in settings['machines']:
    status = "✓ Activa" if machine['enabled'] else "✗ Inactiva"
    print(f"- {machine['path']}: {status}")
```

### Crear una máquina

```python
import requests
import json

TOKEN = "tu_token_aqui"
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

new_machine = {
    "machine_code": "sec99",
    "machine_name": "Máquina Nueva",
    "config": {
        "machine": {
            "code": "sec99",
            "name": "Máquina Nueva"
        },
        "plc": {
            "code": "sec99_plc",
            "name": "PLC Nueva",
            "protocol": "modbus_tcp",
            "ip_address": "192.168.72.99",
            "port": 502,
            "unit_id": 1,
            "poll_interval_s": 1,
            "enabled": True
        },
        "sensors": []
    }
}

response = requests.post(
    "http://localhost:8000/api/machines-config",
    json=new_machine,
    headers=headers
)
print(response.json())
```

### Activar/Desactivar máquinas

```python
import requests
import urllib.parse

TOKEN = "tu_token_aqui"
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Desactivar máquina
path = "machines/sec21.yml"
encoded_path = urllib.parse.quote(path, safe='')

response = requests.put(
    f"http://localhost:8000/api/machines-settings/{encoded_path}",
    json={"path": path, "enabled": False},
    headers=headers
)
print(response.json())

# Activar máquina
response = requests.put(
    f"http://localhost:8000/api/machines-settings/{encoded_path}",
    json={"path": path, "enabled": True},
    headers=headers
)
print(response.json())

# Invertir estado
response = requests.post(
    f"http://localhost:8000/api/machines-settings/{encoded_path}/toggle",
    headers=headers
)
print(response.json())
```

---

## 💻 Ejemplos en JavaScript

### Listar máquinas

```javascript
const TOKEN = "tu_token_aqui";
const headers = {
  "Authorization": `Bearer ${TOKEN}`
};

// Listar máquinas
fetch("http://localhost:8000/api/machines-config", { headers })
  .then(r => r.json())
  .then(machines => {
    machines.forEach(m => {
      console.log(`- ${m.code}: ${m.machine_name}`);
    });
  });

// Listar máquinas en settings
fetch("http://localhost:8000/api/machines-settings", { headers })
  .then(r => r.json())
  .then(data => {
    data.machines.forEach(m => {
      const status = m.enabled ? "✓ Activa" : "✗ Inactiva";
      console.log(`- ${m.path}: ${status}`);
    });
  });
```

### Crear máquina

```javascript
const TOKEN = "tu_token_aqui";
const headers = {
  "Authorization": `Bearer ${TOKEN}`,
  "Content-Type": "application/json"
};

const newMachine = {
  machine_code: "sec99",
  machine_name: "Máquina Nueva",
  config: {
    machine: {
      code: "sec99",
      name: "Máquina Nueva"
    },
    plc: {
      code: "sec99_plc",
      name: "PLC Nueva",
      protocol: "modbus_tcp",
      ip_address: "192.168.72.99",
      port: 502,
      unit_id: 1,
      poll_interval_s: 1,
      enabled: true
    },
    sensors: []
  }
};

fetch("http://localhost:8000/api/machines-config", {
  method: "POST",
  headers,
  body: JSON.stringify(newMachine)
})
  .then(r => r.json())
  .then(result => console.log(result));
```

### Activar/Desactivar máquinas

```javascript
const TOKEN = "tu_token_aqui";
const headers = {
  "Authorization": `Bearer ${TOKEN}`,
  "Content-Type": "application/json"
};

// Desactivar máquina
const path = "machines/sec21.yml";
const encodedPath = encodeURIComponent(path);

fetch(`http://localhost:8000/api/machines-settings/${encodedPath}`, {
  method: "PUT",
  headers,
  body: JSON.stringify({ path, enabled: false })
})
  .then(r => r.json())
  .then(result => console.log(result));

// Invertir estado
fetch(`http://localhost:8000/api/machines-settings/${encodedPath}/toggle`, {
  method: "POST",
  headers
})
  .then(r => r.json())
  .then(result => console.log(result));
```

---

## 🧪 Script de Prueba

Se incluye un script de prueba completo en `test_machines_api.py`:

```bash
# Hacer ejecutable
chmod +x test_machines_api.py

# Ejecutar
python3 test_machines_api.py
```

O ejecutar pruebas específicas:

```bash
# Solo lectura (sin modificar datos)
python3 -c "from test_machines_api import *; test_list_machines(); test_list_settings()"
```

---

## 📝 Notas Importantes

### URL Encoding
Los paths en los endpoints deben estar URL-encoded:
- `machines/sec21.yml` → `machines%2Fsec21.yml`

**Python:**
```python
import urllib.parse
encoded = urllib.parse.quote("machines/sec21.yml", safe='')
# encoded = "machines%2Fsec21.yml"
```

**JavaScript:**
```javascript
const encoded = encodeURIComponent("machines/sec21.yml");
// encoded = "machines%2Fsec21.yml"
```

### Estado en settings.yml
- **Habilitada**: Sin `#` al principio → `- machines/sec21.yml`
- **Deshabilitada**: Con `#` al principio → `#- machines/sec21.yml`

### Efectos de desactivar en settings.yml
Cuando desactivas una máquina en settings.yml:
1. Se agrega `#` al principio de la línea
2. El collector NO la cargará en la próxima sincronización
3. Los datos históricos NO se pierden
4. Puedes reactivarla en cualquier momento

### Eliminar archivo YAML
Cuando usas DELETE en `/api/machines-config/{code}`:
1. Se borra el archivo YAML
2. Debes remover la máquina de settings.yml por separado
3. Los datos históricos en BD NO se pierden (se guarda el código)

---

## 🔐 Autenticación

Todos los endpoints requieren token Bearer en el header:

```
Authorization: Bearer <tu_token>
```

El token se genera automáticamente al arrancar el API y se guarda en:
```
config/api_token.txt
```

---

## 📌 Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/machines-config` | Listar máquinas YAML |
| GET | `/api/machines-config/{code}` | Obtener máquina específica |
| POST | `/api/machines-config` | Crear máquina |
| PUT | `/api/machines-config/{code}` | Actualizar máquina |
| DELETE | `/api/machines-config/{code}` | Eliminar máquina |
| GET | `/api/machines-settings` | Listar máquinas en settings |
| POST | `/api/machines-settings` | Agregar a settings |
| PUT | `/api/machines-settings/{path}` | Activar/desactivar |
| POST | `/api/machines-settings/{path}/toggle` | Invertir estado |
| DELETE | `/api/machines-settings/{path}` | Remover de settings |

---

## ✨ Ejemplos de Uso Completo

### Flujo: Crear máquina y habilitarla

```python
import requests
import urllib.parse

TOKEN = "tu_token"
headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# 1. Crear archivo YAML
machine_data = {
    "machine_code": "sec25",
    "machine_name": "Secadora 25",
    "config": {
        "machine": {"code": "sec25", "name": "Secadora 25"},
        "plc": {
            "code": "sec25_plc",
            "name": "PLC Secadora 25",
            "protocol": "modbus_tcp",
            "ip_address": "192.168.72.25",
            "port": 502,
            "unit_id": 1,
            "poll_interval_s": 1,
            "enabled": True
        },
        "sensors": []
    }
}

response = requests.post("http://localhost:8000/api/machines-config", json=machine_data, headers=headers)
print(f"Máquina creada: {response.json()['machine_code']}")

# 2. Agregar a settings
settings_data = {"path": "machines/sec25.yml", "enabled": True}
response = requests.post("http://localhost:8000/api/machines-settings", json=settings_data, headers=headers)
print(f"Máquina agregada a settings: {response.json()}")

# 3. Verificar
response = requests.get("http://localhost:8000/api/machines-settings", headers=headers)
for m in response.json()['machines']:
    if m['code'] == 'sec25':
        print(f"Máquina sec25 está {'✓ Activa' if m['enabled'] else '✗ Inactiva'}")
```

---

¡Listo! Ahora puedes gestionar todas tus máquinas a través de la API.
