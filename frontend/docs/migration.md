# 🚀 SCADA Pro v0.1.0 - Guía de Migración

Esta guía te ayudará a migrar desde versiones de desarrollo a la versión 0.1.0 de SCADA Pro.

## 📋 Cambios Importantes en v0.1.0

### 🔄 Cambios de Breaking Changes

#### 1. Nombre del Proyecto
- **Antes**: `industrial-scada-pro`
- **Ahora**: `scada-pro`

```bash
# Actualizar nombre en package.json
npm pkg set name=scada-pro
```

#### 2. Estructura de Variables de Entorno
Se han reorganizado las variables de entorno para mayor claridad:

```bash
# Antes (desarrollo)
API_TOKEN=token_aqui

# Ahora (v0.1.0) - Más organizado
API_TOKEN=token_aqui
DB_USER=backend
DB_PASSWORD=tu_password
DB_NAME=industrial
```

#### 3. Scripts de Package.json
Nuevos scripts disponibles:

```bash
# Desarrollo
npm run lint          # Verificar código
npm run lint:fix      # Corregir problemas de linting
npm run format        # Formatear código
npm run type-check    # Verificar tipos TypeScript

# Docker
npm run docker:build  # Construir imagen
npm run docker:run    # Ejecutar contenedor
```

### 🆕 Nuevas Características

#### Dashboard Mejorado
- Interfaz moderna con estética SCADA
- Modo fullscreen por máquina
- Widgets mejorados con mejores gráficos

#### Docker Optimizado
- Multi-stage build más eficiente
- Health checks automáticos
- Configuración de Nginx optimizada

#### Documentación Completa
- README comprehensivo
- Guía de Docker detallada
- Configuración de entorno documentada

## 🔧 Pasos de Migración

### Paso 1: Backup de Datos
```bash
# Backup de configuraciones existentes
cp .env .env.backup
cp -r data data.backup 2>/dev/null || true
```

### Paso 2: Actualizar Repositorio
```bash
# Si usas git, actualizar desde el repositorio
git pull origin main
git checkout v0.1.0  # Si existe tag
```

### Paso 3: Actualizar Dependencias
```bash
# Limpiar e instalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Paso 4: Actualizar Configuración
```bash
# Copiar nueva configuración de entorno
cp .env.example .env

# Editar .env con tus valores anteriores
nano .env
```

### Paso 5: Verificar Configuración
```bash
# Verificar que todo esté correcto
npm run lint
npm run type-check
npm run build
```

### Paso 6: Probar Docker (Opcional)
```bash
# Si usas Docker, reconstruir
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🐛 Solución de Problemas

### Error: "Cannot find module"
```bash
# Limpiar cache de Node.js
npm cache clean --force
rm -rf node_modules
npm install
```

### Error: "Port already in use"
```bash
# Matar procesos en puertos usados
npx kill-port 3000 3001 3002 5173
```

### Error: "ESLint configuration"
```bash
# Si hay problemas con ESLint
npm run lint:fix
# O deshabilitar temporalmente
npm run build  # Build funciona sin linting
```

### Error: "TypeScript errors"
```bash
# Verificar tipos
npm run type-check

# Si hay errores, pueden ser por cambios en interfaces
# Revisar types.ts y ajustar según sea necesario
```

## 📊 Verificación Post-Migración

Después de la migración, verifica que todo funcione:

### ✅ Checklist
- [ ] `npm run build` funciona sin errores
- [ ] `npm run dev` inicia correctamente
- [ ] Dashboard carga en navegador
- [ ] Sensores se muestran correctamente
- [ ] Gráficos históricos funcionan
- [ ] Docker build funciona (si aplica)

### 🧪 Pruebas Funcionales
```bash
# Verificar health check
curl http://localhost:3005/health

# Verificar API (si backend está corriendo)
curl http://localhost:8000/api/health
```

## 🔄 Rollback (Si es Necesario)

Si algo sale mal, puedes hacer rollback:

```bash
# Restaurar backup
cp .env.backup .env
cp -r data.backup data 2>/dev/null || true

# Revertir cambios de git
git checkout HEAD~1
npm install
```

## 📞 Soporte

Si encuentras problemas durante la migración:

1. **Revisa los logs**: `npm run dev` y verifica errores en consola
2. **Verifica configuración**: Compara tu `.env` con `.env.example`
3. **Limpia cache**: `rm -rf node_modules && npm install`
4. **Reporta issues**: [GitHub Issues](https://github.com/your-org/SCADApro/issues)

---

**¡Felicidades!** Has migrado exitosamente a SCADA Pro v0.1.0 🎉