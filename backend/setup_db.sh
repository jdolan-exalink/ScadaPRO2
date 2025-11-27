#!/usr/bin/env bash
# Quick Setup Script - Ejecuta todas las migrations de una vez
# Uso: bash setup.sh

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$PROJECT_DIR/api"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🗄️  PLC Backend - Quick Database Setup            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar si estamos en el directorio correcto
if [ ! -f "$API_DIR/models.py" ]; then
    echo "❌ Error: No se encontró $API_DIR/models.py"
    echo "Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

echo "📂 Directorio del proyecto: $PROJECT_DIR"
echo "📂 Directorio API: $API_DIR"
echo ""

# Cambiar a directorio API
cd "$API_DIR"

echo "🔍 Verificando Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 no está instalado"
    exit 1
fi
echo "✅ Python encontrado: $(python3 --version)"
echo ""

# Verificar dependencias
echo "🔍 Verificando dependencias..."
if ! python3 -c "import sqlalchemy" 2>/dev/null; then
    echo "⚠️  SQLAlchemy no está instalado. Instalando..."
    pip install sqlalchemy sqlalchemy[asyncio] asyncpg
fi

if ! python3 -c "import yaml" 2>/dev/null; then
    echo "⚠️  PyYAML no está instalado. Instalando..."
    pip install pyyaml
fi

echo "✅ Dependencias verificadas"
echo ""

# Ejecutar init_db
echo "═════════════════════════════════════════════════════════════"
echo "🚀 Iniciando creación de tablas..."
echo "═════════════════════════════════════════════════════════════"
echo ""

python3 init_db.py

echo ""
echo "═════════════════════════════════════════════════════════════"
echo "✅ ¡Setup completado exitosamente!"
echo "═════════════════════════════════════════════════════════════"
echo ""
echo "Próximos pasos:"
echo "1. Reinicia el API y Collector"
echo "2. Las alarmas se guardarán automáticamente en machine_alarms"
echo ""
