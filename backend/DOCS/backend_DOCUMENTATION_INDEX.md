# 📖 Documentación - API de Gestión de Máquinas v0.9

## 📑 Índice de Documentos

### 🚀 **COMIENZA AQUÍ**
- **[QUICKSTART.md](QUICKSTART.md)** - ⚡ Introducción de 30 segundos
  - Endpoints clave
  - Ejemplos prácticos
  - FAQ

---

### 📚 **GUÍAS COMPLETAS**

#### 1. **[MACHINES_API_GUIDE.md](MACHINES_API_GUIDE.md)** - Guía de Usuario
   - ✓ Instrucciones detalladas
   - ✓ Ejemplos en cURL, Python, JavaScript
   - ✓ URL encoding explicado
   - ✓ Casos de uso comunes
   - ✓ 50+ ejemplos de código

#### 2. **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Documentación Oficial
   - ✓ Sección 8: Gestión de Máquinas - YAML
   - ✓ Sección 9: Gestión de Máquinas - Settings
   - ✓ Ejemplos de respuestas JSON
   - ✓ Códigos de error
   - ✓ Changelog v0.9

#### 3. **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Detalles Técnicos
   - ✓ Archivos creados/modificados
   - ✓ Estructura de datos
   - ✓ Funciones del config_manager
   - ✓ Notas de implementación
   - ✓ Próximos pasos

---

### 🧪 **PRUEBAS Y EJEMPLOS**

#### **[test_machines_api.py](test_machines_api.py)** - Script de Pruebas
```bash
python3 test_machines_api.py
```
- Prueba todos los 12 endpoints
- Ejemplos funcionales
- Listo para ejecutar
- Solo lectura por defecto (comentadas las operaciones de escritura)

---

### 📊 **RESUMEN EJECUTIVO**

#### **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)**
- Resumen gerencial
- Impacto y beneficios
- Roadmap futuro
- Verificación de completitud

---

## 🎯 Selector de Documento por Necesidad

### "Solo quiero empezar rápido"
→ Lee **[QUICKSTART.md](QUICKSTART.md)** (5 minutos)

### "Necesito ver todos los endpoints"
→ Usa **[MACHINES_API_GUIDE.md](MACHINES_API_GUIDE.md)** (15 minutos)

### "Quiero detalles técnicos"
→ Lee **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** secciones 8-9 (20 minutos)

### "Necesito entender la implementación"
→ Revisa **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** (10 minutos)

### "Quiero probar todo automáticamente"
→ Ejecuta **[test_machines_api.py](test_machines_api.py)** (2 minutos)

### "Soy gerente/stakeholder"
→ Lee **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** (10 minutos)

---

## 📋 Guía Rápida: Operaciones Comunes

### Listar máquinas
```bash
GET /api/machines-config
```
**Ver en**: [QUICKSTART.md](QUICKSTART.md) #1 | [MACHINES_API_GUIDE.md](MACHINES_API_GUIDE.md) 1.1

### Ver estado de máquinas (activa/inactiva)
```bash
GET /api/machines-settings
```
**Ver en**: [QUICKSTART.md](QUICKSTART.md) #2 | [MACHINES_API_GUIDE.md](MACHINES_API_GUIDE.md) 2.1

### Crear nueva máquina
```bash
POST /api/machines-config
```
**Ver en**: [MACHINES_API_GUIDE.md](MACHINES_API_GUIDE.md) 1.3 | [API_DOCUMENTATION.md](API_DOCUMENTATION.md) 8.3

### Desactivar máquina
```bash
PUT /api/machines-settings/machines%2Fsec21.yml
```
**Ver en**: [QUICKSTART.md](QUICKSTART.md) Ejemplo Práctico | [MACHINES_API_GUIDE.md](MACHINES_API_GUIDE.md) 2.3

### Invertir estado (toggle)
```bash
POST /api/machines-settings/machines%2Fsec21.yml/toggle
```
**Ver en**: [QUICKSTART.md](QUICKSTART.md) #5 | [MACHINES_API_GUIDE.md](MACHINES_API_GUIDE.md) 2.4

### Eliminar máquina
```bash
DELETE /api/machines-config/sec21
DELETE /api/machines-settings/machines%2Fsec21.yml
```
**Ver en**: [MACHINES_API_GUIDE.md](MACHINES_API_GUIDE.md) 1.5 | [API_DOCUMENTATION.md](API_DOCUMENTATION.md) 8.5

---

## 🔧 Archivos del Sistema

### Creados (4 archivos nuevos)
```
api/config_manager.py          Módulo de gestión YAML/settings
MACHINES_API_GUIDE.md          Guía de usuario
IMPLEMENTATION_SUMMARY.md      Resumen técnico
test_machines_api.py           Script de pruebas
```

### Modificados (3 archivos)
```
api/main.py                    +12 endpoints, +230 líneas
api/schemas.py                 +6 schemas Pydantic
API_DOCUMENTATION.md           +200 líneas de documentación
```

---

## 📊 Estadísticas de Implementación

| Métrica | Valor |
|---------|-------|
| Nuevos Endpoints | 12 |
| Nuevos Schemas | 6 |
| Funciones config_manager | 13 |
| Líneas de Código | +230 (main.py) |
| Documentación | 5 archivos |
| Ejemplos | 50+ |
| Script de Pruebas | 1 |

---

## ✅ Checklist de Implementación

- [x] Módulo config_manager.py creado
- [x] 13 funciones de gestión implementadas
- [x] 5 endpoints YAML (GET, POST, PUT, DELETE, GET-one)
- [x] 7 endpoints Settings (GET, POST, PUT, PUT-toggle, DELETE)
- [x] 6 schemas Pydantic
- [x] Autenticación Bearer en todos los endpoints
- [x] Manejo de errores robusto
- [x] Logging integrado
- [x] Documentación completa
- [x] Ejemplos en Python/JavaScript/cURL
- [x] Script de pruebas
- [x] API_DOCUMENTATION.md actualizado
- [x] Version actualizada a 0.9
- [x] Verificación de compilación

---

## 🚀 Cómo Empezar

### Paso 1: Leer Documentación (Elige una)
```
▶ Principiante: QUICKSTART.md
▶ Usuario: MACHINES_API_GUIDE.md  
▶ Técnico: API_DOCUMENTATION.md
▶ Gerente: EXECUTIVE_SUMMARY.md
```

### Paso 2: Probar Endpoints
```bash
# Opción A: Con cURL
TOKEN=$(cat config/api_token.txt)
curl http://localhost:8000/api/machines-config \
  -H "Authorization: Bearer $TOKEN"

# Opción B: Con Python
python3 test_machines_api.py

# Opción C: Con Swagger
Abre: http://localhost:8000/docs
```

### Paso 3: Integrar en Aplicación
```
Usa los ejemplos en MACHINES_API_GUIDE.md
Adapta para tu caso de uso específico
Consulta API_DOCUMENTATION.md para detalles
```

---

## 📞 Referencia Rápida

### Tokens y Seguridad
- **Token guardado en**: `config/api_token.txt`
- **Renovación**: Automática en cada arranque
- **Header**: `Authorization: Bearer <token>`

### URL Encoding
- `machines/sec21.yml` → `machines%2Fsec21.yml`
- Python: `urllib.parse.quote(path, safe='')`
- JavaScript: `encodeURIComponent(path)`

### Estado de Máquinas
- **Activa**: Sin `#` → `- machines/sec21.yml`
- **Inactiva**: Con `#` → `#- machines/sec21.yml`

### Endpoints Principales
```
GET    /api/machines-config              [listar máquinas]
GET    /api/machines-settings            [ver estado]
POST   /api/machines-config              [crear]
PUT    /api/machines-settings/{path}     [activar/desactivar]
DELETE /api/machines-config/{code}       [eliminar]
```

---

## 🎓 Aprendizaje Progresivo

**Nivel 1 - Iniciante (QUICKSTART.md)**
- Entender qué es cada endpoint
- Ver 5 ejemplos prácticos

**Nivel 2 - Usuario (MACHINES_API_GUIDE.md)**
- Todos los endpoints explicados
- Ejemplos en 3 lenguajes
- URL encoding entendido

**Nivel 3 - Avanzado (API_DOCUMENTATION.md)**
- Detalles técnicos
- Códigos de error
- Casos edge

**Nivel 4 - Experto (IMPLEMENTATION_SUMMARY.md)**
- Arquitectura interna
- Funciones implementadas
- Decisiones de diseño

---

## 💾 Backup y Seguridad

El sistema preserva automáticamente:
- ✅ Archivos YAML (config/machines/*.yml)
- ✅ Configuración de settings (config/settings.yml)
- ✅ Datos históricos en BD (NO se afectan)

Los cambios son inmediatos:
- ✅ No requiere reinicio
- ✅ Collector sincroniza automáticamente
- ✅ Cambios reversibles

---

## 🔗 Enlaces Directos a Secciones

### En API_DOCUMENTATION.md
- [Sección 8: Gestión de Máquinas - YAML](API_DOCUMENTATION.md#8-gestión-de-máquinas---configuración-yaml-nuevo-en-v09)
- [Sección 9: Gestión de Máquinas - Settings](API_DOCUMENTATION.md#9-gestión-de-máquinas---settings-nuevo-en-v09)

### En MACHINES_API_GUIDE.md
- [1. CRUD de Máquinas](MACHINES_API_GUIDE.md#🔧-1-gestión-de-archivos-de-máquinas-yaml)
- [2. Activar/Desactivar](MACHINES_API_GUIDE.md#⚙️-2-gestión-de-settings-activaciónddesactivación)
- [Ejemplos Python](MACHINES_API_GUIDE.md#-ejemplos-en-python)
- [Ejemplos JavaScript](MACHINES_API_GUIDE.md#-ejemplos-en-javascript)

---

## 🎯 Siguientes Pasos

1. ✅ Lee **QUICKSTART.md** (5 min)
2. ✅ Ejecuta **test_machines_api.py** (2 min)
3. ✅ Lee **MACHINES_API_GUIDE.md** (15 min)
4. ✅ Integra en tu aplicación

---

**Versión**: 0.9  
**Fecha**: 27 de Noviembre de 2025  
**Estado**: ✅ Completado y Documentado

¡Listo para usar! 🚀
