#!/bin/bash
# Database Migration Script
# Ejecuta las migrations de la BD

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$PROJECT_ROOT/api"

echo "🗄️  PLC Backend - Database Migration Runner"
echo "=========================================="
echo "Project Root: $PROJECT_ROOT"
echo "API Dir: $API_DIR"
echo ""

# Verificar que Python está disponible
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 no está instalado"
    exit 1
fi

# Cambiar a directorio API
cd "$API_DIR"

# Ejecutar migrations
echo "🚀 Iniciando migrations..."
echo ""

python3 run_migrations.py

echo ""
echo "✅ Proceso completado"
