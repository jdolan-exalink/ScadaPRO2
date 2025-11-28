#!/bin/bash

# Script de verificación para Settings Page y MQTT

echo "========================================"
echo "🔍 Verificación de Settings & MQTT"
echo "========================================"
echo ""

# 1. Verificar que mqttService.ts existe
echo "1️⃣  Verificando mqttService.ts..."
if [ -f "/opt/ScadaPRO2/frontend/services/mqttService.ts" ]; then
    echo "✅ mqttService.ts existe"
else
    echo "❌ mqttService.ts NO EXISTE"
fi
echo ""

# 2. Verificar imports en SettingsPage
echo "2️⃣  Verificando imports en SettingsPage.tsx..."
if grep -q "import { mqttService }" /opt/ScadaPRO2/frontend/features/settings/SettingsPage.tsx; then
    echo "✅ mqttService importado en SettingsPage"
else
    echo "❌ mqttService NO importado en SettingsPage"
fi
echo ""

# 3. Verificar imports en InventoryPage
echo "3️⃣  Verificando imports en InventoryPage.tsx..."
if grep -q "import { mqttService }" /opt/ScadaPRO2/frontend/features/inventory/InventoryPage.tsx; then
    echo "✅ mqttService importado en InventoryPage"
else
    echo "❌ mqttService NO importado en InventoryPage"
fi
echo ""

# 4. Verificar imports en ServerStatusPanel
echo "4️⃣  Verificando imports en ServerStatusPanel.tsx..."
if grep -q "import { mqttService }" /opt/ScadaPRO2/frontend/features/settings/ServerStatusPanel.tsx; then
    echo "✅ mqttService importado en ServerStatusPanel"
else
    echo "❌ mqttService NO importado en ServerStatusPanel"
fi
echo ""

# 5. Verificar endpoint /api/server/status en backend
echo "5️⃣  Verificando endpoint /api/server/status..."
if grep -q '/api/server/status' /opt/ScadaPRO2/backend/api/main.py; then
    echo "✅ Endpoint /api/server/status existe en backend"
else
    echo "❌ Endpoint /api/server/status NO existe en backend"
fi
echo ""

# 6. Verificar WebSocket endpoint mejorado
echo "6️⃣  Verificando WebSocket endpoint mejorado..."
if grep -q '@app.websocket("/ws/realtime")' /opt/ScadaPRO2/backend/api/main.py; then
    echo "✅ WebSocket endpoint /ws/realtime existe"
else
    echo "❌ WebSocket endpoint NO existe"
fi
echo ""

echo "========================================"
echo "✨ Verificación completada"
echo "========================================"
echo ""
echo "Próximos pasos:"
echo "1. Abre http://localhost:3000 en tu navegador"
echo "2. Inicia sesión con admin / admin123"
echo "3. Ve a Settings"
echo "4. Abre la consola del navegador (F12) para ver logs de MQTT"
echo "5. Verifica que ves 'Settings' con botón de Configuración"
