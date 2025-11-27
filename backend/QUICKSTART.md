# ⚡ Inicio Rápido: API de Gestión de Máquinas

## 30 Segundos para Entender

Se agregaron **12 nuevos endpoints REST** al API para:
1. **Crear/leer/actualizar/eliminar máquinas** (archivos YAML)
2. **Activar/desactivar máquinas** en settings.yml

---

## 🔑 Endpoints Clave (Los 5 que MÁS necesitas)

### 1️⃣ Listar máquinas disponibles
```bash
GET /api/machines-config
```
```json
Respuesta: [
  { "machine_code": "sec21", "machine_name": "Secadora 21" },
  { "machine_code": "sec22", "machine_name": "Secadora 22" }
]
```

### 2️⃣ Ver máquinas activas/inactivas
```bash
GET /api/machines-settings
```
```json
Respuesta: {
  "machines": [
    { "path": "machines/sec21.yml", "enabled": true },
    { "path": "machines/sec22.yml", "enabled": false }
  ]
}
```

### 3️⃣ Crear nueva máquina
```bash
POST /api/machines-config
```

### 4️⃣ Desactivar máquina
```bash
PUT /api/machines-settings/machines%2Fsec21.yml
```
(Nota: `/` se convierte en `%2F` en la URL)

### 5️⃣ Invertir estado (on/off toggle)
```bash
POST /api/machines-settings/machines%2Fsec21.yml/toggle
```

---

## 📝 Ejemplo Práctico: Desactivar Máquina

### Con cURL
```bash
# 1. Obtener token (en config/api_token.txt)
TOKEN="tu_token_aqui"

# 2. Desactivar máquina
curl -X PUT \
  "http://localhost:8000/api/machines-settings/machines%2Fsec21.yml" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"path": "machines/sec21.yml", "enabled": false}'

# Respuesta:
# {
#   "message": "Machine 'machines/sec21.yml' updated successfully",
#   "enabled": false
# }
```

### Con Python
```python
import requests
import urllib.parse

TOKEN = "tu_token_aqui"
headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# Desactivar
path = "machines/sec21.yml"
encoded = urllib.parse.quote(path, safe='')

response = requests.put(
    f"http://localhost:8000/api/machines-settings/{encoded}",
    json={"path": path, "enabled": False},
    headers=headers
)
print(response.json())
```

### Con JavaScript
```javascript
const TOKEN = "tu_token_aqui";
const path = "machines/sec21.yml";
const encoded = encodeURIComponent(path);

fetch(`http://localhost:8000/api/machines-settings/${encoded}`, {
  method: "PUT",
  headers: {
    "Authorization": `Bearer ${TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ path, enabled: false })
})
.then(r => r.json())
.then(data => console.log(data));
```

---

## 📚 Documentos Importantes

| Documento | Contenido |
|-----------|----------|
| **MACHINES_API_GUIDE.md** | Guía completa con todos los endpoints |
| **API_DOCUMENTATION.md** | Documentación oficial (secciones 8-9) |
| **test_machines_api.py** | Script para probar endpoints |
| **EXECUTIVE_SUMMARY.md** | Resumen técnico |

---

## 🔑 Token de Autenticación

Después de arrancar el API, el token se genera automáticamente:

```bash
cat config/api_token.txt
# eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Usar en headers:
```
Authorization: Bearer <token>
```

---

## 🧪 Probar Rápidamente

```bash
# 1. Listar máquinas (sin modificar nada)
curl http://localhost:8000/api/machines-config \
  -H "Authorization: Bearer $(cat config/api_token.txt)"

# 2. Ver settings
curl http://localhost:8000/api/machines-settings \
  -H "Authorization: Bearer $(cat config/api_token.txt)"
```

---

## 🚀 Casos de Uso Comunes

### ✅ Desactivar temporalmente una máquina
```bash
PUT /api/machines-settings/machines%2Fsec21.yml
{ "enabled": false }
```
- El archivo YAML se preserva
- Los datos históricos se conservan
- El collector no la cargará

### ✅ Activar una máquina desactivada
```bash
PUT /api/machines-settings/machines%2Fsec21.yml
{ "enabled": true }
```

### ✅ Crear nueva máquina
```bash
POST /api/machines-config
{
  "machine_code": "sec99",
  "machine_name": "Nueva Máquina",
  "config": { ... configuración YAML ... }
}
```

### ✅ Eliminar máquina
```bash
DELETE /api/machines-config/sec99
DELETE /api/machines-settings/machines%2Fsec99.yml
```

---

## 💡 Tips Importantes

### 1. URL Encoding
En la URL, `/` se convierte en `%2F`:
```
machines/sec21.yml  →  machines%2Fsec21.yml
```

### 2. Estado en settings.yml
```yaml
# Activa (sin #)
- machines/sec21.yml

# Desactiva (con #)
#- machines/sec22.yml
```

### 3. No se Pierden Datos
- Desactivar: ✅ Datos preservados
- Eliminar YAML: ✅ Datos en BD preservados
- Eliminar de settings: ✅ Datos preservados

---

## 📊 Referencia Rápida de Endpoints

```
MÁQUINAS (YAML)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET    /api/machines-config
GET    /api/machines-config/{code}
POST   /api/machines-config
PUT    /api/machines-config/{code}
DELETE /api/machines-config/{code}

SETTINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET    /api/machines-settings
POST   /api/machines-settings
PUT    /api/machines-settings/{path}
POST   /api/machines-settings/{path}/toggle
DELETE /api/machines-settings/{path}
```

---

## 🎯 Próximos Pasos

1. **Leer**: `MACHINES_API_GUIDE.md` para detalles completos
2. **Probar**: `test_machines_api.py` para ver todos los endpoints
3. **Integrar**: En tu aplicación frontend o backend
4. **Consultar**: `API_DOCUMENTATION.md` (secciones 8-9)

---

## ❓ Preguntas Frecuentes

**P: ¿Qué pasa si desactivo una máquina?**  
R: Se agrega `#` en settings.yml, el collector no la cargará, pero los datos se preservan.

**P: ¿Puedo modificar máquinas mientras se recolectan datos?**  
R: Sí, el collector sincroniza automáticamente cada cambio.

**P: ¿Se pierden los datos históricos si elimino una máquina?**  
R: No, los datos históricos en la base de datos se preservan.

**P: ¿Necesito reiniciar el API para los cambios?**  
R: No, todo se actualiza automáticamente.

**P: ¿Puedo crear máquinas desde el panel?**  
R: Sí, usa los endpoints POST y PUT para crear/editar.

---

**¿Necesitas ayuda?** Revisa `MACHINES_API_GUIDE.md` o ejecuta `python3 test_machines_api.py`

✨ **¡Listo para usar!** ✨
