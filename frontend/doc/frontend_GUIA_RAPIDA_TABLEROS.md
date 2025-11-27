# 🚀 Guía Rápida - Sistema de Tableros

## Acceso Rápido

**URL:** `http://localhost:5173/#/boards`

**Icono:** 📊 Grid (en la barra lateral izquierda)

## Primeros Pasos en 5 Minutos

### 1️⃣ Crear tu Primer Tablero (30 segundos)
```
1. Click en "Tableros" (esquina superior derecha)
2. Escribir nombre: "Mi Tablero"
3. Click "Crear"
✅ Tablero creado
```

### 2️⃣ Agregar una Máquina (1 minuto)
```
1. Click en "Editar"
2. Click en "Agregar máquina"
3. Seleccionar máquina de la lista
4. ✅ Pestaña creada automáticamente
```

### 3️⃣ Agregar Sensores/Medidores (2 minutos)
```
1. Con modo "Editar" activo
2. Click "Agregar Medidor"
3. Seleccionar sensor de la lista
4. Repetir para más sensores
5. ✅ Widgets agregados
```

### 4️⃣ Visualizar en Tiempo Real (1 minuto)
```
1. Click "Guardar" (ya está en modo edición)
2. ¡Verás los widgets con datos en vivo!
3. Los datos se actualizan cada 5 segundos automáticamente
```

## Funciones Principales

### 📌 Crear Múltiples Tableros
- Cada tablero es independiente
- Guardar como favorito (el último usado se recuerda)
- Útil para diferentes áreas: Producción, Calidad, Mantenimiento

### 🔄 Importar/Exportar
```
Tableros → Exportar  → Descarga JSON
Tableros → Importar  → Sube JSON → Cargado
```
**Perfecto para:**
- Compartir con colegas
- Backup de configuraciones
- Replicas de tableros

### ✏️ Editar en Cualquier Momento
```
1. Click "Editar"
2. Agregar o quitar widgets
3. Cambiar de máquinas
4. Click "Guardar"
```

## Tipos de Widgets Disponibles

| Tipo | Icono | Ideal Para | Ejemplo |
|------|-------|-----------|---------|
| **Medidor** | 📊 | Valores en rango | Temperatura, Presión, RPM |
| **KPI** | 📈 | Indicadores | Eficiencia, Disponibilidad |
| **Estado** | 🔘 | ON/OFF | Motor encendido, Alarma activa |
| **Gráfico** | 📉 | Históricos | Tendencias, Comparativas |

## Configuración de Widgets

### Medidor (Gauge)
```
Rango: 0-100
Alerta en: 85
Color: Verde → Amarillo → Rojo
```

### KPI
```
Valor actual
Tendencia: ↑ ↓ → (arriba, abajo, estable)
```

### Estado
```
ON (verde)  vs  OFF (gris)
ACTIVO      vs  INACTIVO
```

### Gráfico
```
Últimas 24 horas
Actualización cada minuto
Línea azul = histórico
```

## Tips & Trucos

💡 **Organize bien tus tableros**
- Un tablero por área de producción
- Usa nombres descriptivos
- Exporta configuraciones importantes

💡 **Monitoreo eficiente**
- No agregues más de 20 widgets por pestaña
- Los gráficos consumen más recursos
- Usa gauges para monitoreo rápido

💡 **Compartir tableros**
- Exporta el JSON
- Comparte por email/chat
- El destinatario lo importa

💡 **Backup automático**
- Los datos se guardan en el navegador
- Exporta regularmente como respaldo
- Si borras cookies se pierden

## Troubleshooting Rápido

### ❌ "No veo datos"
**Solución:**
```
1. Asegurate que la máquina esté activa
2. Verifica que el sensor sea del tipo correcto
3. Recarga la página (F5)
```

### ❌ "Los widgets están vacíos"
**Solución:**
```
1. Espera 5-10 segundos para actualización
2. Verifica conexión con API
3. Abre DevTools (F12) para ver errores
```

### ❌ "Se perdió mi tablero"
**Solución:**
```
1. Si tenías backup JSON, importa
2. Si no, recrear es la opción
3. Siempre exporta después de cambios importantes
```

## Ejemplo Práctico: Monitoreo de Línea de Producción

### Paso a Paso:

```
1. Crear tablero: "Línea Principal"
   
2. Agregar máquina: "Sección 21 - Enfriamiento"
   
3. Agregar widgets:
   - Temperatura actual (Gauge, 0-100°C, alerta 85)
   - Velocidad motor (KPI)
   - Estado máquina (Status ON/OFF)
   - Historial 1h (Chart)
   
4. Guardar
   
5. ¡Listo! Monitoreo en vivo
```

### Resultado:
Una pantalla con:
- 📊 Medidor grande mostrando temperatura actual
- 📈 Número con tendencia de velocidad
- 🔘 Indicador de estado
- 📉 Gráfico con tendencia del último tiempo

## Teclado & Shortcuts

| Acción | Atajo |
|--------|-------|
| Crear tablero | Ingresar nombre + Enter |
| Cambiar tablero | Click en nombre |
| Modo edición | Click "Editar" |
| Agregar medidor | Click "+ Agregar Medidor" |
| Guardar cambios | Click "Guardar" |
| Eliminar widget | Click X en widget (modo edición) |

## Límites & Consideraciones

### Storage
- **Máximo por navegador:** ~5MB
- **Widgets recomendados:** 20-30 por pestaña
- **Tableros recomendados:** 5-10 activos

### Actualización
- **Frecuencia:** Cada 5 segundos (automático)
- **Históricos:** Últimas 24-48 horas generalmente

### Soportado
✅ Chrome / Edge / Firefox / Safari  
✅ Desktop (optimizado)  
⚠️ Mobile (responsive pero mejor en desktop)

---

**¿Necesitas más ayuda?**

Consulta el archivo completo: `features/boards/README.md`

Hoy es un buen día para empezar a monitorear 🚀
