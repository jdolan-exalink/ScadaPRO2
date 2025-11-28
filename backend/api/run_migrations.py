#!/usr/bin/env python3
"""
Database Migration Runner
Ejecuta migrations SQL en orden secuencial
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from .database import engine, AsyncSessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrations")

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


class MigrationRunner:
    def __init__(self):
        self.migrations_applied = []
        self.migrations_failed = []

    async def get_migration_history(self, session: AsyncSession):
        """Obtener historial de migrations aplicadas"""
        try:
            result = await session.execute(text("SELECT * FROM migrations_history"))
            return [row[0] for row in result.fetchall()]
        except Exception:
            # Tabla no existe aún
            return []

    async def create_migrations_table(self, session: AsyncSession):
        """Crear tabla para rastrear migrations"""
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS migrations_history (
                migration_name VARCHAR(255) PRIMARY KEY,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(50) DEFAULT 'success'
            )
        """))
        await session.commit()

    async def execute_migration(self, session: AsyncSession, migration_file: Path):
        """Ejecutar un archivo de migration"""
        migration_name = migration_file.name

        try:
            # Leer contenido del archivo
            with open(migration_file, 'r') as f:
                sql_content = f.read()

            # Ejecutar SQL
            logger.info(f"🔄 Ejecutando: {migration_name}")
            await session.execute(text(sql_content))
            await session.commit()

            # Registrar en historial
            await session.execute(text(
                "INSERT INTO migrations_history (migration_name, status) VALUES (:name, 'success')"
            ), {"name": migration_name})
            await session.commit()

            logger.info(f"✅ Completada: {migration_name}")
            self.migrations_applied.append(migration_name)
            return True

        except Exception as e:
            logger.error(f"❌ Error en {migration_name}: {str(e)}")
            self.migrations_failed.append({
                "migration": migration_name,
                "error": str(e)
            })
            await session.rollback()
            return False

    async def run(self):
        """Ejecutar todas las migrations pendientes"""
        logger.info("🚀 Iniciando runner de migrations...")

        async with AsyncSessionLocal() as session:
            # Crear tabla de historial si no existe
            await self.create_migrations_table(session)

            # Obtener migrations ya aplicadas
            applied = await self.get_migration_history(session)

            # Obtener todos los archivos de migration
            migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))

            if not migration_files:
                logger.warning("⚠️ No se encontraron archivos de migration")
                return

            logger.info(f"📂 Encontradas {len(migration_files)} migrations")

            # Ejecutar migrations pendientes
            for migration_file in migration_files:
                migration_name = migration_file.name

                if migration_name in applied:
                    logger.info(f"⏭️ Ya aplicada: {migration_name}")
                    continue

                success = await self.execute_migration(session, migration_file)
                if not success:
                    logger.error(f"⛔ Deteniendo por error en: {migration_name}")
                    break

        # Resumen
        self._print_summary()

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
            logger.info("❌ Fallidas: 0")

        logger.info("="*60 + "\n")


async def main():
    runner = MigrationRunner()
    await runner.run()


if __name__ == "__main__":
    asyncio.run(main())
