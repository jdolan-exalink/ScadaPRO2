#!/usr/bin/env python3
"""
Validation Script - Verifica que la BD está correctamente configurada
"""

import sys
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger()

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60 + "\n")

def check_imports():
    """Verifica que todos los módulos necesarios están disponibles"""
    print_header("🔍 Verificando imports")
    
    required_modules = {
        'sqlalchemy': 'SQLAlchemy',
        'sqlalchemy.ext.asyncio': 'SQLAlchemy Async',
        'asyncpg': 'asyncpg (PostgreSQL driver)',
        'yaml': 'PyYAML',
        'psycopg2': 'psycopg2 (Optional pero recomendado)',
    }
    
    missing = []
    for module, name in required_modules.items():
        try:
            __import__(module)
            print(f"  ✅ {name}")
        except ImportError:
            if module == 'psycopg2':
                print(f"  ⚠️  {name} (opcional)")
            else:
                print(f"  ❌ {name}")
                missing.append(name)
    
    if missing:
        print(f"\n❌ Faltan instalar: {', '.join(missing)}")
        print("\nInstala con:")
        print("  pip install sqlalchemy[asyncio] asyncpg pyyaml psycopg2-binary")
        return False
    
    print(f"\n✅ Todos los imports están disponibles")
    return True

def check_db_connection():
    """Verifica conexión a la BD"""
    print_header("🔌 Verificando conexión a BD")
    
    try:
        from .database import get_db_url
        print(f"  DB URL: {get_db_url()}")
        
        import asyncio
        from .database import engine
        
        async def test_connection():
            try:
                async with engine.connect() as conn:
                    result = await conn.execute("SELECT 1")
                    _ = result.fetchone()
                    return True
            except Exception as e:
                print(f"  ❌ Error: {e}")
                return False
        
        success = asyncio.run(test_connection())
        if success:
            print("  ✅ Conexión a BD exitosa")
        return success
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def check_tables():
    """Verifica que las tablas existen"""
    print_header("📋 Verificando tablas")
    
    try:
        import asyncio
        from .database import AsyncSessionLocal
        from sqlalchemy import text
        
        async def check():
            async with AsyncSessionLocal() as session:
                # Lista de tablas esperadas
                expected_tables = [
                    'machines',
                    'plcs',
                    'sensors',
                    'sensor_data',
                    'sensor_last_value',
                    'plc_status',
                    'system_logs',
                    'machine_alarms',  # La tabla nueva
                ]
                
                result = await session.execute(text("""
                    SELECT tablename FROM pg_tables 
                    WHERE schemaname = 'public'
                """))
                existing_tables = [row[0] for row in result.fetchall()]
                
                all_good = True
                for table in expected_tables:
                    if table in existing_tables:
                        print(f"  ✅ {table}")
                    else:
                        print(f"  ❌ {table} (FALTA)")
                        all_good = False
                
                return all_good
        
        return asyncio.run(check())
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def check_migrations():
    """Verifica historial de migrations"""
    print_header("📊 Historial de Migrations")
    
    try:
        import asyncio
        from .database import AsyncSessionLocal
        from sqlalchemy import text
        
        async def check():
            async with AsyncSessionLocal() as session:
                try:
                    result = await session.execute(text("""
                        SELECT migration_name, executed_at, status 
                        FROM migrations_history 
                        ORDER BY executed_at DESC
                    """))
                    rows = result.fetchall()
                    
                    if not rows:
                        print("  (sin migrations previas)")
                        return True
                    
                    for migration_name, executed_at, status in rows:
                        status_symbol = "✅" if status == "success" else "❌"
                        print(f"  {status_symbol} {migration_name} ({executed_at})")
                    
                    return True
                    
                except Exception:
                    print("  (tabla migrations_history no existe)")
                    return True
        
        return asyncio.run(check())
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def check_models():
    """Verifica que MachineAlarm está en modelos"""
    print_header("📝 Verificando Modelos")
    
    try:
        import models
        
        if hasattr(models, 'MachineAlarm'):
            print("  ✅ Modelo MachineAlarm encontrado")
            
            # Verificar campos
            expected_fields = [
                'id', 'machine_id', 'sensor_id', 'alarm_code', 
                'alarm_name', 'severity', 'status', 'color',
                'timestamp_on', 'timestamp_off', 'created_at', 'updated_at'
            ]
            
            ma = models.MachineAlarm
            for field in expected_fields:
                if hasattr(ma, field):
                    print(f"    ✅ {field}")
                else:
                    print(f"    ❌ {field} (FALTA)")
            
            return True
        else:
            print("  ❌ Modelo MachineAlarm NO encontrado")
            return False
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print_header("🔧 Validación de Instalación - PLC Backend Alarms")
    
    results = {
        'imports': check_imports(),
        'db_connection': check_db_connection(),
        'tables': check_tables(),
        'migrations': check_migrations(),
        'models': check_models(),
    }
    
    print_header("📊 RESUMEN")
    
    checks = [
        ('Imports', results['imports']),
        ('Conexión BD', results['db_connection']),
        ('Tablas', results['tables']),
        ('Migrations', results['migrations']),
        ('Modelos', results['models']),
    ]
    
    passed = sum(1 for _, result in checks if result)
    total = len(checks)
    
    for name, result in checks:
        symbol = "✅" if result else "❌"
        print(f"  {symbol} {name}")
    
    print(f"\n  Total: {passed}/{total} verificaciones pasadas\n")
    
    if all(results.values()):
        print("✅ ¡Todo está listo! El sistema de alarmas está configurado.")
        print("\nPróximos pasos:")
        print("  1. Reinicia el API: docker-compose restart api")
        print("  2. Reinicia el Collector: docker-compose restart collector")
        print("  3. Las alarmas se guardarán automáticamente en machine_alarms")
        return 0
    else:
        print("❌ Hay problemas en la configuración.")
        print("\nPara completar la instalación:")
        print("  1. python3 api/init_db.py    # Crear tablas")
        print("  2. python3 validate.py       # Verificar nuevamente")
        return 1

if __name__ == "__main__":
    sys.exit(main())
