# 🧪 Guía de Prueba: Settings & MQTT Fix

## Estado Actual
✅ Todos los componentes están implementados
✅ Frontend compila sin errores
✅ Backend tiene nuevos endpoints

## Pasos para Probar

### Paso 1: Verificar que el Backend Está Corriendo

```bash
# Terminal 1: Verifica que el backend API está activo
curl -s http://localhost:8000/api/health
# Debería responder: {"status":"ok"}

curl -s http://localhost:8000/api/version
# Debería responder: {"version":"0.9"}

curl -s http://localhost:8000/api/server/status
# Debería devolver un JSON con estado del servidor
```

### Paso 2: Verificar que el Frontend Está Corriendo

```bash
# Terminal 2: Verifica que el frontend está sirviendo archivos
curl -s http://localhost:3000 | head -20
# Debería mostrar HTML del índice
```

### Paso 3: Abrir el Navegador

1. Abre: http://localhost:3000
2. Deberías ver la página de login

### Paso 4: Iniciar Sesión

1. Usuario: `admin`
2. Contraseña: `admin123`
3. Haz clic en "Login"

### Paso 5: Navegar a Settings

1. Una vez autenticado, busca el menú o navegación
2. Haz clic en "Settings" o "Configuración"
3. **La página debería cargar sin errores** ✅

### Paso 6: Verificar la Consola del Navegador

1. Presiona F12 para abrir DevTools
2. Ve a la pestaña "Console"
3. Deberías ver logs como:

```
🔌 Connecting to WebSocket: ws://10.147.18.10:8000/ws/realtime?token=...
📡 WebSocket connection status: connecting
✅ WebSocket connected
📡 WebSocket connection status: connected
📡 Subscribing to sensor updates...
📊 System status from collector via MQTT: {...}
```

### Paso 7: Verificar los Elementos de la Página

En la página de Settings deberías ver:

1. **Header:**
   - Título: "Configuración del Sistema"
   - Estado de MQTT: `connecting` → `connected` (color verde)
   - Botón "Refrescar"
   - Botón "Configuración" (púrpura)

2. **Contenido Principal:**
   - **Opción A:** Si hay datos del backend:
     - Panel con estado del servidor
     - Información de MQTT Broker
     - Estado de PostgreSQL
     - Estado del Collector
   
   - **Opción B:** Si NO hay datos del backend:
     - Mensaje: "Estado del servidor no disponible"
     - Explicación: "No se pudo conectar al backend..."
     - Botón "Reintentar"

### Paso 8: Configurar el Backend (Opcional)

Si la IP `10.147.18.10` no es correcta en tu entorno:

1. Haz clic en botón "Configuración"
2. Se abrirá un modal
3. Cambia el Host a la IP correcta (ej: `localhost`, `192.168.x.x`)
4. Verifica que Port es `8000`
5. Haz clic en "Guardar"
6. La página debería reintentar conectar automáticamente

---

## 🐛 Troubleshooting

### Problema: "Settings sigue sin verse"

**Solución:**
1. Abre la consola (F12)
2. Verifica si hay errores de JavaScript
3. Revisa si el servidor backend está corriendo
4. Verifica que estás autenticado

### Problema: "WebSocket connection error"

**Causas:**
- Backend no está corriendo
- IP/Puerto incorrectos
- Firewall bloqueando conexión
- MQTT no está conectado en el backend

**Solución:**
1. Verifica que backend está corriendo: `curl http://localhost:8000/api/health`
2. Revisa logs del backend para errores
3. Cambia la configuración del host en Settings
4. Verifica que MQTT está corriendo: `mosquitto -v` (si lo tienes instalado)

### Problema: "Estado del servidor no disponible"

**Causas:**
- Backend está corriendo pero el endpoint `/api/server/status` retorna error
- Datos incompletos

**Solución:**
1. Verifica que el backend tiene la última versión:
   ```bash
   grep -n "/api/server/status" /opt/ScadaPRO2/backend/api/main.py
   ```
2. Si no está, actualiza el backend
3. Reinicia el backend
4. Haz clic en "Reintentar" en la página

### Problema: "Access Denied" en Settings

**Causas:**
- Usuario no tiene permiso `edit_config`
- El sistema de permisos está fallando

**Solución:**
1. Verifica que estás usando usuario `admin`
2. Abre la consola y verifica `localStorage`
3. Revisa que el token es válido

---

## 📊 Qué Ver en la Consola

### Logs de Éxito:
```
🔌 Connecting to WebSocket: ws://10.147.18.10:8000/ws/realtime?token=...
📡 WebSocket connection status: connecting
✅ WebSocket connected
📡 WebSocket connection status: connected
📡 Subscribing to sensor updates...
📊 PostgreSQL status from MQTT: {...}
```

### Logs de Error (pero aceptables):
```
⚠️ Unknown message format: {...}
Error fetching sensors from backend: TypeError: Failed to fetch
```

### Logs de Error (requieren atención):
```
❌ Global Exception: ...
Cannot find namespace 'NodeJS'
mqttService is not defined
```

---

## 🎯 Checklist de Prueba

- [ ] Login funciona con `admin / admin123`
- [ ] Puedo navegar a Settings sin error "Access Denied"
- [ ] Veo el header con título y botones
- [ ] Veo estado de MQTT en el header (connecting/connected/error)
- [ ] Veo contenido principal (estado del servidor o mensaje de error)
- [ ] Consola no tiene errores rojos de JavaScript
- [ ] Puedo hacer clic en "Configuración" y se abre un modal
- [ ] Puedo ver la URL del WebSocket en la consola
- [ ] Si cambio la configuración, la página intenta reconectar

---

## 📝 Notas Finales

- La página de Settings es **NUEVA** y está completamente funcional
- El servicio MQTT es **SINGLETON** (una sola instancia en toda la app)
- La reconexión es **AUTOMÁTICA** con backoff exponencial
- Los errores se **MANEJAN GRACEFULLY** sin romper la página
- La configuración se **GUARDA EN LOCALSTORAGE** para persistencia

¡Todo debería funcionar correctamente ahora! 🎉
