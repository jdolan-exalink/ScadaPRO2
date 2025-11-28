# 🚀 Quick Start - ScadaPRO2 Unified Stack

> **Get the complete ScadaPRO2 system running in 5 minutes**

## Prerequisites

- Docker & Docker Compose installed
- Git (to clone the repository)
- ~2GB free disk space

## 5-Minute Setup

### Step 1: Prepare (1 min)

```bash
cd ScadaPRO2
cp .env.example .env
```

> Optional: Edit `.env` to change database password or API token

### Step 2: Build & Start (3 min)

```bash
docker-compose up -d --build
```

> Grab a coffee ☕ - This builds and starts all 4 services

### Step 3: Verify (30 sec)

```bash
docker-compose ps
```

Should show 4 services all with status `healthy` or `up`:
```
NAME            STATUS
scada-db        healthy
scada-mqtt      healthy
scada-backend   healthy
scada-frontend  healthy
```

### Step 4: Access (1 min)

Open your browser:

| Service | URL | Username/Token |
|---------|-----|---|
| **Dashboard** | http://localhost | (none) |
| **API Docs** | http://localhost:8000/docs | (interactive) |
| **API Health** | http://localhost:8000/api/health | (public) |

---

## What You Get

✅ **Frontend SCADA Dashboard**
- Industrial IoT Boards & Widgets
- Real-time Sensor Monitoring
- Alarms & Alerts Center

✅ **Backend API**
- RESTful API for all operations
- WebSocket for real-time updates
- Complete documentation at `/docs`

✅ **Database**
- PostgreSQL for persistence
- Automatic schema initialization
- YAML-based machine configuration

✅ **Real-time Messaging**
- MQTT Broker for sensor data
- Live telemetry streaming
- Industrial data protocols

---

## First Steps

### 1. Check API Health
```bash
curl http://localhost:8000/api/health
# {"status": "ok"}
```

### 2. View Machines
```bash
# Get API token
export TOKEN=$(cat backend/config/api_token.txt)

# List machines
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/machines
```

### 3. View Alarms
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/alarms/active
```

### 4. Open Dashboard
```
http://localhost → Click "Tableros"
```

---

## Common Tasks

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop Services
```bash
docker-compose stop
```

### Start Again
```bash
docker-compose start
```

### Restart Services
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Full Reset
```bash
# WARNING: Deletes all data
docker-compose down -v
docker-compose up -d --build
```

---

## Troubleshooting

### "Cannot connect to backend"
1. Check services are running: `docker-compose ps`
2. Check logs: `docker-compose logs backend`
3. Verify URL: Should be `http://localhost:8000`

### "Machines not loading"
1. Check database is running: `docker-compose ps db`
2. Check backend has machines configured
3. Try refreshing browser (Ctrl+F5)

### "Port already in use"
Edit `docker-compose.yml`:
- Change `80:80` to `8080:80`
- Change `8000:8000` to `8001:8000`

Then restart:
```bash
docker-compose up -d
```

### "Services won't start"
```bash
# Check what's wrong
docker-compose logs

# Rebuild everything
docker-compose down -v
docker-compose up -d --build
```

---

## Full Documentation

- 📖 [Complete Deployment Guide](./DOCKER_DEPLOYMENT.md)
- 🔗 [Frontend Integration Guide](./FRONTEND_INTEGRATION.md)
- ✅ [Verification Checklist](./VERIFICATION_CHECKLIST.md)
- 📋 [Project Summary](./PROJECT_SUMMARY.md)

---

## API Quick Reference

```bash
TOKEN=$(cat backend/config/api_token.txt)
BASE=http://localhost:8000

# Machines
curl -H "Authorization: Bearer $TOKEN" $BASE/api/machines

# Sensors
curl -H "Authorization: Bearer $TOKEN" $BASE/api/sensors

# Active Alarms
curl -H "Authorization: Bearer $TOKEN" $BASE/api/alarms/active

# All Alarms
curl -H "Authorization: Bearer $TOKEN" $BASE/api/alarms

# API Documentation
curl $BASE/docs
```

---

## Next Steps

After initial verification:

1. ✅ Check machines are loading in dashboard
2. ✅ Verify alarms page displays
3. ✅ Test creating boards and widgets
4. ✅ Configure your machines (YAML files)
5. ✅ Set up alarms for your system

---

## Support

- **Issues**: Check logs with `docker-compose logs`
- **Docs**: See links above
- **API Help**: Navigate to `http://localhost:8000/docs`

---

**Happy monitoring!** 🏭
