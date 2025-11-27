# 🗄️ SETUP DE BD - Sistema de Alarmas

## ⚡ Inicio Rápido (1 minuto)

```bash
cd /root/plc-backend/api
python3 init_db.py
```

¡Listo! La tabla `machine_alarms` se creó automáticamente.

---

## 📋 Archivos Creados

```
/root/plc-backend/
├── 🟢 setup_db.sh                          # Script bash rápido (recomendado)
├── 🟢 MIGRATIONS_GUIDE.md                  # Guía completa
├── 📁 api/
│   ├── 🟢 init_db.py                       # OPCIÓN 1: Crear tablas (RECOMENDADO)
│   ├── 🟢 migrate.py                       # OPCIÓN 2: Ejecutar migrations SQL
│   ├── 🟢 run_migrations.py                # OPCIÓN 3: Alternative migration runner
│   ├── 🟢 validate.py                      # Validar instalación
│   ├── 🟢 alembic.ini                      # Config Alembic (opcional)
│   └── 📁 migrations/
│       ├── 🟢 __init__.py
│       └── 🟢 001_create_machine_alarms_table.sql
└── 🟢 run_migrations.sh                    # Script bash alternativo
```

---

## 🚀 3 Formas de Ejecutar

### OPCIÓN 1: SQLAlchemy (⭐ RECOMENDADO)
```bash
cd /root/plc-backend/api
python3 init_db.py
```
✅ Automático | ✅ Sincroniza con models.py | ✅ Sin historial necesario

### OPCIÓN 2: Migration Runner SQL
```bash
cd /root/plc-backend/api
python3 migrate.py
```
✅ Control manual | ✅ Con historial de migrations | ✅ Para scripts complejos

### OPCIÓN 3: Bash Script
```bash
cd /root/plc-backend
bash setup_db.sh
```
✅ Una línea | ✅ Verifica dependencias | ✅ Todo automático

---

## ✅ Verificar que Funcionó

```bash
cd /root/plc-backend/api
python3 validate.py
```

Output esperado:
```
✅ Imports
✅ Conexión BD
✅ Tablas
✅ Migrations
✅ Modelos

Total: 5/5 verificaciones pasadas

✅ ¡Todo está listo!
```

---

## 🗂️ Estructura de la Tabla `machine_alarms`

```sql
CREATE TABLE machine_alarms (
    id                 SERIAL PRIMARY KEY,
    machine_id         INTEGER NOT NULL,      -- FK -> machines.id
    sensor_id          INTEGER NOT NULL,      -- FK -> sensors.id
    alarm_code         VARCHAR(255) NOT NULL, -- falla_variador_sec21
    alarm_name         VARCHAR(255) NOT NULL, -- Falla Variador SEC21
    severity           VARCHAR(50) NOT NULL,  -- high, critical, medium, low
    status             INTEGER DEFAULT 1,     -- 1=activa, 0=inactiva
    color              VARCHAR(7) DEFAULT '#FF0000',
    timestamp_on       TIMESTAMP WITH TIME ZONE NOT NULL,  -- Activación
    timestamp_off      TIMESTAMP WITH TIME ZONE,           -- Desactivación
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Índices Automáticos
- `machine_id` - Para filtrar por máquina
- `alarm_code` - Para búsqueda de alarmas
- `status` - Para filtrar activas/inactivas
- `timestamp_on DESC` - Para ordenar por fecha
- `created_at DESC` - Para auditoría
- Composite: `(machine_id, status)` - Queries comunes
- Partial: `status=1 AND timestamp_off IS NULL` - Alarmas activas

---

## 🔄 Cómo Funciona

1. **Collector detecta falla** (0→1 transición en sensor)
   ↓
2. **Crea registro en machine_alarms** con `timestamp_on = AHORA`
   ↓
3. **Guarda en BD** con status=1 (ACTIVA)
   ↓
4. **API devuelve alarma** vía `/api/alarms/active`
   ↓
5. **UI muestra en ROJO** con pulsación
   ↓
6. **Falla se resuelve** (1→0 transición)
   ↓
7. **Actualiza registro** con `timestamp_off = AHORA`, status=0
   ↓
8. **Historial guardado** para auditoría

---

## 📊 Endpoints Disponibles

```
GET  /api/alarms                      # Todas las alarmas
GET  /api/alarms/active               # Solo activas (ROJO)
GET  /api/machines/{id}/alarms        # Historial máquina
POST /api/alarms                      # Crear manual
PATCH /api/alarms/{id}                # Actualizar estado
```

---

## 🐳 En Docker

```bash
# Crear tablas
docker-compose exec api python3 api/init_db.py

# Verificar
docker-compose exec api python3 api/validate.py
```

---

## ⚠️ Troubleshooting

| Problema | Solución |
|----------|----------|
| `ModuleNotFoundError: database` | Ejecuta desde `/root/plc-backend/api` |
| `password authentication failed` | Verifica `config/settings.yml` |
| `table "machines" does not exist` | Primero: `python3 init_db.py` |
| `FOREIGN KEY constraint failed` | Asegúrate que machines/sensors existen |

---

## 📚 Documentación Completa

Para más detalles, lee:
- [`MIGRATIONS_GUIDE.md`](../MIGRATIONS_GUIDE.md) - Guía completa
- [`ALARMAS_IMPLEMENTACION.md`](../ALARMAS_IMPLEMENTACION.md) - Detalles técnicos

---

## ✨ Próximas Acciones

1. ✅ Ejecuta: `python3 api/init_db.py`
2. ✅ Verifica: `python3 api/validate.py`
3. ✅ Reinicia: `docker-compose restart api collector`
4. ✅ Las alarmas se guardarán automáticamente 🎉

**¡Sistema listo para producción!** 🚀
