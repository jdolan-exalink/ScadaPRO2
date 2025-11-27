#!/usr/bin/env python3
"""
Database Initialization Script (Método SQLAlchemy)
Crea todas las tablas usando los modelos definidos en models.py

Uso:
    python3 init_db.py      # Crear todas las tablas
    python3 init_db.py --drop  # Borrar y recrear todas las tablas (¡CUIDADO!)
"""

import asyncio
import sys
import logging
from datetime import datetime
from sqlalchemy import text

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("init_db")

try:
    from database import engine, Base
    import models  # Importar modelos para registrarlos en Base
except ImportError as e:
    logger.error(f"❌ Error importando módulos: {e}")
    logger.info("Asegúrate de ejecutar desde el directorio /api")
    sys.exit(1)


async def init_db(drop_all=False):
    """
    Inicializar base de datos creando todas las tablas
    
    Args:
        drop_all: Si True, elimina todas las tablas primero
    """
    logger.info("\n" + "="*60)
    logger.info("🗄️  Database Initialization Script (SQLAlchemy)")
    logger.info("="*60 + "\n")

    try:
        async with engine.begin() as conn:
            if drop_all:
                logger.warning("⚠️ ELIMINANDO TODAS LAS TABLAS...")
                await conn.run_sync(Base.metadata.drop_all)
                logger.info("✅ Tablas eliminadas")

            logger.info("📝 Creando tablas desde modelos...")
            await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ Tablas creadas exitosamente")

            # Obtener lista de tablas creadas
            logger.info("\n📊 Tablas en la base de datos:")
            result = await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
            tables = result.fetchall()
            for table in sorted(tables):
                logger.info(f"   • {table[0]}")

    except Exception as e:
        logger.error(f"❌ Error durante la inicialización: {e}")
        sys.exit(1)

    finally:
        await engine.dispose()

    logger.info("\n" + "="*60)
    logger.info("✅ Base de datos inicializada correctamente")
    logger.info("="*60 + "\n")


def main():
    drop_all = "--drop" in sys.argv or "--drop-all" in sys.argv

    if drop_all:
        response = input("⚠️  ¿Estás seguro de que quieres ELIMINAR todas las tablas? (s/n): ")
        if response.lower() != 's':
            logger.info("Operación cancelada")
            sys.exit(0)

    asyncio.run(init_db(drop_all=drop_all))


if __name__ == "__main__":
    main()
