#!/usr/bin/env python3
"""
Database Migration Runner (Versión Simplificada)
Ejecuta migrations SQL directamente con psycopg2
Recomendado para ambientes Docker
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime
import yaml

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("migrations")

try:
    import psycopg2
    from psycopg2.extras import DictCursor
except ImportError:
    logger.error("❌ psycopg2 no está instalado. Instala con: pip install psycopg2-binary")
    sys.exit(1)


class PostgreSQLMigrationRunner:
    def __init__(self):
        self.conn = None
        self.cursor = None
        self.migrations_applied = []
        self.migrations_failed = []

    def get_db_config(self):
        """Obtener configuración de BD desde settings.yml o variables de entorno"""
        config_path = os.getenv("CONFIG_PATH", "./config")
        settings_file = os.path.join(config_path, "settings.yml")

        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                config = yaml.safe_load(f)
                db_conf = config.get("database", {})
                return {
                    "host": db_conf.get("host", "localhost"),
                    "port": db_conf.get("port", 5432),
                    "user": db_conf.get("user", "backend"),
                    "password": db_conf.get("password", "backend_pass"),
                    "database": db_conf.get("name", "industrial")
                }

        # Fallback a variables de entorno
        return {
            "host": os.getenv("DB_HOST", "localhost"),
            "port": int(os.getenv("DB_PORT", 5432)),
            "user": os.getenv("DB_USER", "backend"),
            "password": os.getenv("DB_PASSWORD", "backend_pass"),
            "database": os.getenv("DB_NAME", "industrial")
        }

    def connect(self):
        """Conectar a PostgreSQL"""
        try:
            config = self.get_db_config()
            logger.info(f"🔌 Conectando a BD: {config['user']}@{config['host']}:{config['port']}/{config['database']}")

            self.conn = psycopg2.connect(
                host=config["host"],
                port=config["port"],
                user=config["user"],
                password=config["password"],
                database=config["database"]
            )
            self.cursor = self.conn.cursor(cursor_factory=DictCursor)
            logger.info("✅ Conexión exitosa")
            return True

        except psycopg2.OperationalError as e:
            logger.error(f"❌ Error de conexión: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"❌ Error inesperado: {str(e)}")
            return False

    def create_migrations_table(self):
        """Crear tabla para rastrear migrations"""
        try:
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS migrations_history (
                    id SERIAL PRIMARY KEY,
                    migration_name VARCHAR(255) UNIQUE NOT NULL,
                    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(50) DEFAULT 'success'
                )
            """)
            self.conn.commit()
            logger.info("✅ Tabla de historial de migrations verificada")

        except Exception as e:
            logger.error(f"❌ Error creando tabla de historial: {str(e)}")
            self.conn.rollback()

    def get_applied_migrations(self):
        """Obtener lista de migrations ya aplicadas"""
        try:
            self.cursor.execute("SELECT migration_name FROM migrations_history WHERE status = 'success'")
            return [row[0] for row in self.cursor.fetchall()]

        except psycopg2.ProgrammingError:
            # Tabla no existe aún
            return []

    def execute_migration(self, migration_file: Path):
        """Ejecutar un archivo de migration"""
        migration_name = migration_file.name

        try:
            with open(migration_file, 'r') as f:
                sql_content = f.read()

            logger.info(f"🔄 Ejecutando: {migration_name}")

            # Ejecutar SQL (puede contener múltiples statements)
            self.cursor.execute(sql_content)
            self.conn.commit()

            # Registrar en historial
            self.cursor.execute(
                "INSERT INTO migrations_history (migration_name, status) VALUES (%s, 'success')",
                (migration_name,)
            )
            self.conn.commit()

            logger.info(f"✅ Completada: {migration_name}")
            self.migrations_applied.append(migration_name)
            return True

        except psycopg2.Error as e:
            logger.error(f"❌ Error SQL en {migration_name}: {str(e)}")
            self.migrations_failed.append({
                "migration": migration_name,
                "error": str(e)
            })
            self.conn.rollback()
            return False

        except Exception as e:
            logger.error(f"❌ Error inesperado en {migration_name}: {str(e)}")
            self.migrations_failed.append({
                "migration": migration_name,
                "error": str(e)
            })
            self.conn.rollback()
            return False

    def run(self):
        """Ejecutar todas las migrations pendientes"""
        logger.info("\n" + "="*60)
        logger.info("🚀 PLC Backend - Database Migration Runner")
        logger.info("="*60 + "\n")

        # Conectar a BD
        if not self.connect():
            logger.error("⛔ No se pudo conectar a la base de datos")
            sys.exit(1)

        # Crear tabla de historial
        self.create_migrations_table()

        # Obtener migrations ya aplicadas
        applied = self.get_applied_migrations()
        logger.info(f"📋 Migrations previas: {len(applied)}\n")

        # Obtener todos los archivos de migration
        migrations_dir = Path(__file__).parent / "migrations"
        migration_files = sorted(migrations_dir.glob("*.sql"))

        if not migration_files:
            logger.warning("⚠️ No se encontraron archivos de migration")
            self.disconnect()
            return

        logger.info(f"📂 Encontradas {len(migration_files)} migrations\n")

        # Ejecutar migrations pendientes
        for migration_file in migration_files:
            migration_name = migration_file.name

            if migration_name in applied:
                logger.info(f"⏭️ Ya aplicada: {migration_name}")
                continue

            success = self.execute_migration(migration_file)
            if not success and migration_name.startswith("001"):
                # Detener en migrations críticas
                logger.error(f"⛔ Deteniendo por error en migration crítica: {migration_name}")
                break

        self.disconnect()
        self._print_summary()

    def disconnect(self):
        """Cerrar conexión"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.info("🔌 Conexión cerrada")

    def _print_summary(self):
        """Mostrar resumen de ejecución"""
        logger.info("\n" + "="*60)
        logger.info("📊 RESUMEN DE MIGRATIONS")
        logger.info("="*60)
        logger.info(f"✅ Aplicadas: {len(self.migrations_applied)}")
        for m in self.migrations_applied:
            logger.info(f"   • {m}")

        if self.migrations_failed:
            logger.info(f"❌ Fallidas: {len(self.migrations_failed)}")
            for m in self.migrations_failed:
                logger.error(f"   • {m['migration']}: {m['error']}")
        else:
            logger.info(f"❌ Fallidas: 0")

        logger.info("="*60 + "\n")


def main():
    runner = PostgreSQLMigrationRunner()
    runner.run()


if __name__ == "__main__":
    main()
