# Database Migrations - Guía de Uso

## Overview

Este proyecto proporciona **tres métodos** para ejecutar migrations de base de datos y crear la tabla `machine_alarms`:

1. **SQLAlchemy** (Recomendado) - Automático, usa modelos de Python
2. **Migration Runner SQL** - Manual, más control
3. **psql directo** - Para emergencias o scripts personalizados

---

## Opción 1: SQLAlchemy (RECOMENDADO) ⭐

### Descripción
Crea automáticamente TODAS las tablas basadas en los modelos definidos en `models.py`. Es el método más simple y mantiene la consistencia.

### Uso

**Crear tablas:**
```bash
cd /root/plc-backend/api
python3 init_db.py
```

**Eliminar y recrear tablas (⚠️ BORRA DATOS):**
```bash
python3 init_db.py --drop
```

### Output esperado
```
============================================================
🗄️  Database Initialization Script (SQLAlchemy)
============================================================

📝 Creando tablas desde modelos...
✅ Tablas creadas exitosamente

📊 Tablas en la base de datos:
   • machine_alarms
   • machines
   • plc_status
   • plcs
   • sensor_data
   • sensor_last_value
   • sensors
   • system_logs

============================================================
✅ Base de datos inicializada correctamente
============================================================
```

### Ventajas
- ✅ Automático: lee todos los modelos de `models.py`
- ✅ Sincronización: si cambias models.py, se crean/modifican tablas automáticamente
- ✅ Seguro: verifica que tablas no existan antes de crearlas
- ✅ Rápido: una línea de comando

---

## Opción 2: Migration Runner SQL (Control Manual)

### Descripción
Ejecuta archivos `.sql` secuencialmente. Útil para migrations complejas o cuando necesitas más control.

### Archivos de Migration
```
api/migrations/
├── 001_create_machine_alarms_table.sql  (Tabla machine_alarms)
└── (próximas migrations se agregan aquí)
```

### Uso

**Opción 2a: Python (Recomendado para Docker)**
```bash
cd /root/plc-backend/api
python3 migrate.py
```

**Opción 2b: Bash script**
```bash
cd /root/plc-backend
chmod +x run_migrations.sh
./run_migrations.sh
```

### Output esperado
```
============================================================
🚀 PLC Backend - Database Migration Runner
============================================================

🔌 Conectando a BD: backend@localhost:5432/industrial
✅ Conexión exitosa
✅ Tabla de historial de migrations verificada

📂 Encontradas 1 migrations

🔄 Ejecutando: 001_create_machine_alarms_table.sql
✅ Completada: 001_create_machine_alarms_table.sql

============================================================
📊 RESUMEN DE MIGRATIONS
============================================================
✅ Aplicadas: 1
   • 001_create_machine_alarms_table.sql
❌ Fallidas: 0
============================================================
```

### Agregar nuevas migrations

Para agregar una nueva migration:

1. Crear archivo en `api/migrations/` con numeración secuencial:
   ```bash
   touch api/migrations/002_add_new_feature.sql
   ```

2. Escribir SQL (debe empezar con `BEGIN;` y terminar con `COMMIT;`):
   ```sql
   -- Migration: Descripción de cambios
   -- Created: 2025-11-27
   
   BEGIN;
   
   -- Tu SQL aquí
   CREATE TABLE nuevo_tabla (...);
   CREATE INDEX idx_nuevo ON nuevo_tabla(columna);
   
   COMMIT;
   ```

3. Ejecutar migrations:
   ```bash
   python3 api/migrate.py
   ```

### Tabla de Historial
Se crea automáticamente una tabla `migrations_history` para rastrear qué migrations ya se aplicaron:

```sql
SELECT * FROM migrations_history;
```

Resultado:
```
 id │              migration_name              │      executed_at       │ status
────┼──────────────────────────────────────────┼────────────────────────┼────────
  1 │ 001_create_machine_alarms_table.sql      │ 2025-11-27 10:30:45+00 │ success
```

---

## Opción 3: Ejecutar directamente con psql

### Para usuarios con psql instalado

```bash
# Conectar a BD y ejecutar migrations
psql -h localhost -U backend -d industrial -f api/migrations/001_create_machine_alarms_table.sql

# O en una sola línea, todo junto
psql postgresql://backend:backend_pass@localhost:5432/industrial < api/migrations/001_create_machine_alarms_table.sql
```

---

## En Entorno Docker

### Dentro del contenedor API

```bash
# Opción 1: SQLAlchemy (más simple)
docker exec plc-api python3 api/init_db.py

# Opción 2: Migration Runner
docker exec plc-api python3 api/migrate.py
```

### Desde el host

```bash
# Opción 1: SQLAlchemy
docker-compose exec api python3 init_db.py

# Opción 2: Migration Runner
docker-compose exec api python3 migrate.py
```

---

## Verificar que todo está bien

Después de ejecutar migrations, verifica:

```bash
# Conectar a BD
psql postgresql://backend:backend_pass@localhost:5432/industrial

# Ver tabla machine_alarms
\d machine_alarms

# Ver historial de migrations
SELECT * FROM migrations_history;

# Contar registros
SELECT COUNT(*) FROM machine_alarms;
```

Output esperado:
```
                    Table "public.machine_alarms"
      Column      │           Type           │ Collation │ Nullable │ Default
──────────────────┼──────────────────────────┼───────────┼──────────┼─────────
 id               │ integer                  │           │ not null │ nextval(...)
 machine_id       │ integer                  │           │ not null │
 sensor_id        │ integer                  │           │ not null │
 alarm_code       │ character varying(255)   │           │ not null │
 alarm_name       │ character varying(255)   │           │ not null │
 severity         │ character varying(50)    │           │ not null │
 status           │ integer                  │           │           │ 1
 color            │ character varying(7)     │           │           │ '#FF0000'::character varying
 timestamp_on     │ timestamp with time zone │           │ not null │
 timestamp_off    │ timestamp with time zone │           │           │
 created_at       │ timestamp with time zone │           │           │ CURRENT_TIMESTAMP
 updated_at       │ timestamp with time zone │           │           │ CURRENT_TIMESTAMP
Indexes:
    "machine_alarms_pkey" PRIMARY KEY, btree (id)
    "idx_machine_alarms_active" btree (status, timestamp_off) WHERE status = 1 AND timestamp_off IS NULL
    "idx_machine_alarms_alarm_code" btree (alarm_code)
    "idx_machine_alarms_created_at" btree (created_at DESC)
    "idx_machine_alarms_machine_status" btree (machine_id, status)
    "idx_machine_alarms_machine_id" btree (machine_id)
    "idx_machine_alarms_sensor_id" btree (sensor_id)
    "idx_machine_alarms_status" btree (status)
    "idx_machine_alarms_timestamp_on" btree (timestamp_on DESC)
Foreign-key constraints:
    "machine_alarms_ibfk_1" FOREIGN KEY (machine_id) REFERENCES machines(id)
    "machine_alarms_ibfk_2" FOREIGN KEY (sensor_id) REFERENCES sensors(id)
```

---

## Troubleshooting

### Error: "module 'database' has no attribute 'Base'"
**Solución:** Asegúrate de estar en el directorio `/api` cuando ejecutas los scripts:
```bash
cd /root/plc-backend/api
python3 init_db.py
```

### Error: "FATAL: password authentication failed"
**Solución:** Verifica que las credenciales de BD en `config/settings.yml` sean correctas:
```yaml
database:
  host: localhost
  port: 5432
  user: backend
  password: backend_pass
  name: industrial
```

### Error: "table "machines" does not exist"
**Solución:** Las tablas base no existen. Primero crea todas las tablas:
```bash
python3 init_db.py
```

### Error: "relation "migrations_history" already exists"
**Solución:** Es normal. El script verifica si existe antes de crearla. Puedes ignorar este error.

---

## Resumen Recomendado

| Caso | Comando |
|------|---------|
| **Primero (crear todo)** | `python3 api/init_db.py` |
| **Agregar nuevas migrations** | `python3 api/migrate.py` |
| **Verificar estado** | `SELECT * FROM migrations_history;` |
| **Borrar todo (testing)** | `python3 api/init_db.py --drop` ⚠️ |

---

## Archivos Disponibles

```
/root/plc-backend/
├── api/
│   ├── init_db.py                    ← Crea tablas desde modelos (RECOMENDADO)
│   ├── migrate.py                    ← Ejecuta migrations SQL
│   ├── models.py                     ← Define la tabla MachineAlarm
│   ├── migrations/
│   │   └── 001_create_machine_alarms_table.sql  ← SQL de migration
│   └── alembic.ini                   ← Configuración Alembic (opcional)
├── run_migrations.sh                 ← Script bash para migrations
└── MIGRATIONS_GUIDE.md              ← Esta guía
```

---

## Siguientes Pasos

1. ✅ Ejecuta migration: `python3 api/init_db.py`
2. ✅ Verifica: `psql ... -c "SELECT * FROM machine_alarms LIMIT 1;"`
3. ✅ Reinicia API/Collector
4. ✅ Las alarmas se guardarán automáticamente en la BD

¡Listo! 🎉
