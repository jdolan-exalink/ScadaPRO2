# 🏭 ScadaPRO2 - Deployment & Integration Guide

> **Integrated Backend + Frontend Stack with Docker Compose**

This document describes how to deploy the complete ScadaPRO2 system with the unified `docker-compose.yml`.

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Deployment](#-deployment)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)

## 🚀 Quick Start

### Option 1: Production-Ready Stack (Recommended)

```bash
# Clone/navigate to repository
cd ScadaPRO

# Copy and configure environment
cp .env.example .env

# Edit .env with your settings
# - Change DB_PASSWORD
# - Set API_TOKEN (generate secure token)
# - Adjust VITE_BACKEND_URL if needed

# Build and start all services
docker-compose up -d --build

# Verify services are running
docker-compose ps

# Access the system
# - Frontend: http://localhost
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
# - Adminer (Database GUI): http://localhost:8080 (if added)
```

### Option 2: Development with Volume Mounts

```bash
# For backend development (Python hot-reload)
docker-compose -f docker-compose.dev.yml up -d

# For frontend development (Vite dev server)
cd frontend && npm run dev
```

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    ScadaPRO2 System                       │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Frontend Container (Nginx)                         │ │
│  │  - React SCADA Dashboard                            │ │
│  │  - Boards & Widgets                                 │ │
│  │  - Alarms Center                                    │ │
│  │  Port: 80/443                                       │ │
│  └────────────────┬────────────────────────────────────┘ │
│                   │ HTTP                                  │
│  ┌────────────────▼────────────────────────────────────┐ │
│  │  Backend Container (FastAPI)                        │ │
│  │  - Industrial IoT API                               │ │
│  │  - Machines & Sensors management                    │ │
│  │  - Alarms system                                    │ │
│  │  - WebSocket real-time data                         │ │
│  │  Port: 8000                                         │ │
│  └────────────────┬───────────────────┬────────────────┘ │
│                   │                   │                   │
│        ┌──────────▼─────┐  ┌──────────▼──────────┐      │
│        │ PostgreSQL DB  │  │  MQTT Broker       │      │
│        │                │  │  (Mosquitto)       │      │
│        │ - Machines     │  │                    │      │
│        │ - Sensors      │  │ - Collector feed   │      │
│        │ - Data         │  │ - Live telemetry   │      │
│        │ - Alarms       │  │                    │      │
│        └────────────────┘  └────────────────────┘      │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

### System Requirements

- **Docker**: v20.10+
- **Docker Compose**: v1.29+
- **Disk Space**: ~2GB for images + data
- **Ports Available**: 80, 443, 5432, 1883, 9001, 8000

### Verify Installation

```bash
docker --version
docker-compose --version
```

## 🔧 Deployment

### Step 1: Prepare Environment

```bash
# Navigate to project root
cd ScadaPRO

# Create .env file
cp .env.example .env

# Edit .env (use your editor)
nano .env  # or edit in VS Code

# Key variables to set:
# - DB_PASSWORD: Strong password for PostgreSQL
# - API_TOKEN: Secure token for API authentication
# - VITE_BACKEND_URL: Frontend's backend URL
```

### Step 2: Build Images

```bash
# Build all containers (first time only, ~5-10 min)
docker-compose build

# Or build and start together
docker-compose up -d --build
```

### Step 3: Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Expected output:
# NAME                 STATUS              PORTS
# scada-db            healthy             5432/tcp
# scada-mqtt          healthy             1883/tcp, 9001/tcp
# scada-backend       healthy             8000/tcp
# scada-frontend      healthy             80/tcp

# Check logs for any errors
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Step 4: Access Services

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | `http://localhost` | SCADA Dashboard |
| Backend API | `http://localhost:8000` | REST API |
| API Docs | `http://localhost:8000/docs` | Swagger UI |
| API Redoc | `http://localhost:8000/redoc` | ReDoc UI |
| PostgreSQL | `localhost:5432` | Database (psql client) |
| MQTT | `localhost:1883` | MQTT Broker |

## ⚙️ Configuration

### Environment Variables (.env)

```env
# Database
DB_USER=backend
DB_PASSWORD=your_strong_password_here
DB_NAME=industrial

# API
API_TOKEN=your_secure_token_here

# Frontend
VITE_BACKEND_URL=http://localhost:8000
```

### Backend Configuration

Backend configuration is read from:
- `/backend/config/settings.yml` - Machine settings
- `/backend/config/machines/` - Individual machine YAML files
- Environment variables (see `.env`)

### Frontend Configuration

Frontend settings are persisted in:
- **Browser LocalStorage**: Dashboard boards, tabs, widgets
- **IndexedDB**: Large data caches

### Database Initialization

On first startup, the backend automatically:
1. Creates PostgreSQL tables (if not exist)
2. Initializes schema with alembic migrations
3. Loads machine configurations from YAML files

No manual SQL needed!

## 📚 API Documentation

### Machines Endpoints

```bash
# List all machines
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8000/api/machines

# Get specific machine
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8000/api/machines/1

# Machine configuration management
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8000/api/admin/machines-config
```

### Sensors Endpoints

```bash
# List sensors
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8000/api/sensors

# Sensor with MQTT topics
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8000/api/sensors/mqtt-topics

# Sensor history
curl -H "Authorization: Bearer $API_TOKEN" \
  "http://localhost:8000/api/sensors/{id}/history?from=2025-01-01T00:00:00Z&to=2025-01-02T00:00:00Z"
```

### Alarms Endpoints

```bash
# Active alarms
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8000/api/alarms/active

# All alarms
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8000/api/alarms

# Machine alarms
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8000/api/machines/{id}/alarms
```

Full API documentation available at: `http://localhost:8000/docs`

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Rebuild from scratch
docker-compose down -v
docker-compose up --build

# Check disk space
df -h
```

### Database Connection Error

```bash
# Verify database container
docker-compose ps db

# Check database logs
docker-compose logs db

# Ensure DB_PASSWORD is set in .env
cat .env | grep DB_PASSWORD

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

### Frontend Can't Connect to Backend

```bash
# Check VITE_BACKEND_URL in .env
cat .env | grep VITE_BACKEND_URL

# Check backend is running
docker-compose exec backend curl http://localhost:8000/api/health

# Check network connectivity
docker-compose exec frontend curl http://backend:8000/api/health
```

### MQTT Connection Issues

```bash
# Check MQTT broker is running
docker-compose ps mqtt

# Check MQTT logs
docker-compose logs mqtt

# Test MQTT connection
docker-compose exec backend mosquitto_sub -h mqtt -t "machines/#" -v

# Restart MQTT
docker-compose restart mqtt
```

### Port Already in Use

```bash
# Check what's using port 80/8000
lsof -i :80    # Linux/Mac
lsof -i :8000  # Linux/Mac

# Or change ports in docker-compose.yml
# Change "80:80" to "8080:80" to use port 8080 instead
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Limit container memory in docker-compose.yml:
# services:
#   backend:
#     deploy:
#       resources:
#         limits:
#           memory: 1G
```

## 📦 Maintenance

### Backup Database

```bash
# Create backup
docker-compose exec db pg_dump -U backend industrial > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20250127.sql | docker-compose exec -T db psql -U backend industrial
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail 100 backend
```

### Stop/Start Services

```bash
# Stop all
docker-compose stop

# Start all
docker-compose start

# Restart specific
docker-compose restart backend
```

### Update Services

```bash
# Update images and restart
docker-compose pull
docker-compose up -d
```

### Clean Up

```bash
# Remove stopped containers
docker-compose down

# Remove all containers, networks, volumes (WARNING: deletes data)
docker-compose down -v

# Prune unused images/volumes
docker system prune -a --volumes
```

## 🔐 Security Considerations

### Production Deployment

1. **Change Passwords**: Set strong DB_PASSWORD in .env
2. **Generate API Token**: Use secure random token for API_TOKEN
3. **Use HTTPS**: Configure SSL certificates with Nginx
4. **Restrict Ports**: Use firewall to limit external access
5. **Update Images**: Regularly pull and rebuild base images

### Example Production .env

```env
DB_PASSWORD=Secure_Pa55w0rd_Change_Me!
API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_BACKEND_URL=https://api.yourcompany.com
```

## 📞 Support

- **Backend Docs**: `/backend/DOCS/backend_DOCUMENTATION_INDEX.md`
- **Frontend Docs**: `/frontend/frontend_TABLEROS_INDICE.md`
- **API Issues**: Check `http://localhost:8000/docs`
- **Container Issues**: Check `docker-compose logs`

---

**Last Updated**: 2025-01-27  
**Version**: 1.0  
**Status**: ✅ Production Ready
