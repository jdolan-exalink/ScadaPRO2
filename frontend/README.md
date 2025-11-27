<div align="center">
  <img src="https://img.shields.io/badge/SCADA%20Pro-v0.2.0-blue?style=for-the-badge" alt="SCADA Pro v0.2.0" />
  <img src="https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.4.1-646CFF?style=for-the-badge&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker" alt="Docker" />
  <br />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge" alt="PRs Welcome" />
</div>

# 🏭 SCADA Pro v0.2.0

**Industrial SCADA Pro** - Sistema SCADA moderno basado en web para monitoreo y control industrial. Diseñado para entornos de manufactura con dashboards personalizables, visualización en tiempo real de sensores, y gestión avanzada de datos históricos.

## ✨ Características Principales

### 🎛️ Dashboard SCADA Interactivo
- **Boards Personalizables**: Crea tableros personalizados por máquina con widgets drag & drop
- **Widgets Industriales**: Gauges, gráficos de línea, indicadores LED, switches, y más
- **Fullscreen Mode**: Vista completa por máquina para monitoreo dedicado
- **Temas Oscuros**: Interfaz optimizada para entornos industriales

### 📊 Visualización de Datos
- **Sensores en Tiempo Real**: Monitoreo continuo de temperatura, humedad, velocidad, presión
- **Gráficos Históricos**: Visualización de tendencias con datos históricos
- **Alertas y Estados**: Indicadores visuales de condiciones críticas
- **Métricas KPI**: Seguimiento de indicadores clave de rendimiento

### 🔧 Tecnologías Industriales
- **MQTT Integration**: Comunicación en tiempo real con brokers MQTT
- **API REST**: Backend robusto para gestión de datos
- **WebSocket**: Actualizaciones en tiempo real sin polling
- **SQLite/PostgreSQL**: Almacenamiento local y distribuido

### 🐳 Despliegue Docker
- **Contenedorizado**: Despliegue completo con Docker Compose
- **Multi-stage Build**: Optimización de imágenes para producción
- **Health Checks**: Monitoreo automático de servicios
- **Configuración Flexible**: Variables de entorno para diferentes entornos

## 🚀 Inicio Rápido

### Prerrequisitos
- **Docker & Docker Compose** (recomendado)
- **Node.js 20+** (para desarrollo local)
- **Git**

### Opción 1: Docker (Recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/your-org/SCADApro.git
cd SCADApro

# Copiar configuración de entorno
cp .env.example .env

# Editar variables de entorno (opcional)
nano .env

# Construir y ejecutar
docker-compose -f docker-compose.local.yml up -d --build

# Acceder a la aplicación
# Frontend: http://localhost:3002
# Backend API: http://localhost:3001
```

### Opción 2: Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env.local

# Ejecutar en modo desarrollo
npm run dev

# Acceder en http://localhost:3002
```

## 📁 Estructura del Proyecto

```
SCADApro/
├── 📁 backend/              # API Backend (Node.js/Express)
├── 📁 components/           # Componentes React reutilizables
├── 📁 features/             # Módulos principales
│   ├── 📁 alarms/          # Sistema de alarmas
│   ├── 📁 boards/          # Dashboard boards
│   ├── 📁 dashboard/       # Dashboard principal
│   ├── 📁 history/         # Historial de datos
│   ├── 📁 inventory/       # Inventario de sensores
│   ├── 📁 machineDetail/   # Detalles de máquinas
│   └── 📁 settings/        # Configuración del sistema
├── 📁 services/             # Servicios (API, MQTT, etc.)
├── 📁 mosquitto/            # Configuración MQTT
├── 🐳 Dockerfile            # Imagen Docker
├── 🐳 docker-compose.yml    # Stack completo
├── 🐳 docker-compose.frontend-only.yml  # Solo frontend
├── 📖 DOCKER.md             # Guía de despliegue Docker
└── 📖 README.md             # Esta documentación
```

## 🐳 Despliegue con Docker

### Stack Completo (Frontend + Backend + DB + MQTT)

```bash
# Levantar todos los servicios
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

### Solo Frontend (Backend Externo)

```bash
# Usar configuración para backend externo
docker-compose -f docker-compose.frontend-only.yml up -d --build

# Configurar BACKEND_HOST en .env si es necesario
echo "BACKEND_HOST=10.147.18.10" >> .env
```

### Puertos por Defecto

| Servicio    | Puerto | Descripción              |
|-------------|--------|--------------------------|
| Frontend    | 80     | Dashboard SCADA         |
| Backend     | 8000   | API REST + WebSocket    |
| PostgreSQL  | 5432   | Base de datos           |
| MQTT        | 1883   | Broker MQTT             |

## ⚙️ Configuración

### Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar según tu entorno
nano .env
```

**Variables principales:**
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Configuración PostgreSQL
- `API_TOKEN`: Token de autenticación para APIs externas
- `BACKEND_HOST`, `BACKEND_PORT`: Backend externo (modo frontend-only)
- `MQTT_HOST`, `MQTT_PORT`: Configuración MQTT

## 🔧 Desarrollo

### Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run preview      # Vista previa del build
npm run docker:build # Construir imagen Docker
npm run docker:run   # Ejecutar contenedor local
```

### Arquitectura

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: Tailwind CSS con tema SCADA oscuro
- **Gráficos**: Recharts para visualización de datos
- **Estado**: React hooks + Context API
- **Persistencia**: IndexedDB para boards, SQLite para datos
- **Comunicación**: MQTT + WebSocket + REST API

## 📊 Características Técnicas

### Widgets Disponibles
- 📈 **LineChart**: Gráficos históricos de tendencias
- 🎯 **Gauge**: Indicadores analógicos (temperatura, presión)
- 🔴 **StatusWidget**: Estados booleanos con colores
- 💡 **LEDIndicator**: Indicadores LED para estados
- 🔘 **SwitchWidget**: Controles de switch
- 📊 **KPIWidget**: Métricas y KPIs

### Gestión de Boards
- **Múltiples Boards**: Organización por líneas de producción
- **Tabs por Máquina**: Cada board puede tener múltiples máquinas
- **Drag & Drop**: Interfaz intuitiva para configuración
- **Persistencia**: Configuraciones guardadas automáticamente
- **Export/Import**: Backup y restauración de configuraciones

### Integración Industrial
- **MQTT**: Comunicación con PLCs y sensores
- **API REST**: Integración con sistemas existentes
- **WebSocket**: Actualizaciones en tiempo real
- **Historial**: Almacenamiento de datos históricos
- **Alertas**: Sistema de notificaciones configurables

## 🤝 Contribuir

1. **Fork** el proyecto
2. Crear rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un **Pull Request**

### Guías de Desarrollo
- Seguir convenciones de TypeScript
- Usar ESLint para linting
- Tests unitarios para componentes críticos
- Documentación de nuevas funcionalidades

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- **React & Vite**: Por el excelente framework de desarrollo
- **Tailwind CSS**: Por el sistema de diseño utilitario
- **Recharts**: Por las librerías de gráficos
- **Docker**: Por la containerización
- **Comunidad Open Source**: Por todas las herramientas utilizadas

## 📞 Soporte

Para soporte técnico o preguntas:
- 📧 Email: support@scadapro.com
- 📖 Documentación: [Wiki del Proyecto](https://github.com/your-org/SCADApro/wiki)
- 🐛 Reportar Issues: [GitHub Issues](https://github.com/your-org/SCADApro/issues)

---

<div align="center">
  <p><strong>SCADA Pro v0.2.0</strong> - Sistema SCADA moderno para la industria 4.0</p>
  <p>Hecho con ❤️ para la comunidad industrial</p>
</div>
