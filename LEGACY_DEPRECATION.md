# 🗑️ Legacy Code & Deprecation Notice

This document outlines the legacy code that should be considered deprecated following the integration of the frontend with the real backend.

## Old Embedded Backend

### Location: `frontend/backend/`

**Status**: ❌ **DEPRECATED** - No longer used

**What it was**:
- Node.js Express server
- Local data management
- Simulated MQTT integration
- Old database schema

**Why it's deprecated**:
- Replaced by real FastAPI backend (`/backend`)
- Frontend now connects to `/backend/api`
- All functionality moved to centralized backend

**Recommendation**:
- ✅ KEEP for reference (git history)
- Consider archiving in a `legacy/` branch
- Remove from production deployments

**Files to consider archiving**:
```
frontend/backend/
  ├── Dockerfile          # Old Node.js backend build
  ├── server.js           # Main server (no longer used)
  ├── package.json        # Old dependencies
  ├── package-lock.json
  ├── config/             # Old configuration
  ├── data/               # Old sample data
  └── ...
```

---

## Old Docker Compose Files

### Files Affected

#### 1. `frontend/docker-compose.yml`
**Status**: ❌ **DEPRECATED** - Use `/docker-compose.yml` instead

**What it did**:
- Started frontend + embedded backend + database + MQTT all in one
- Old monolithic stack for development
- Included Node.js backend container

**Why deprecated**:
- Replaced by unified root `/docker-compose.yml`
- New stack uses real FastAPI backend
- Better separation of concerns

**Migration**:
```bash
# OLD (no longer works):
cd frontend
docker-compose up

# NEW (use this):
cd ../  # Go to root
docker-compose up
```

#### 2. `frontend/docker-compose.local.yml`
**Status**: ❌ **DEPRECATED** - Use `/docker-compose.yml` instead

**What it did**:
- Local development setup with embedded backend
- Included volume mounts for code editing

**Recommendation**:
- Archive or delete
- If needed for legacy reference only

#### 3. `frontend/docker-compose.frontend-only.yml`
**Status**: ❌ **DEPRECATED** - Use new stack

**What it did**:
- Frontend-only deployment
- Assumed backend was external (hardcoded URL)

**Note**:
- New stack via `.env` file now handles external backend
- More flexible than old approach

---

## Deprecated Services

### iotService.ts (Partial)

**Status**: ⚠️ **PARTIALLY DEPRECATED**

Some functions from old `iotService` are no longer used:

```typescript
// DEPRECATED - no longer used
getConnectedMachines()        // Use scadaBackendService.getMachines()
getSensorHistoryByCode()      // Use scadaBackendService.getSensorHistory()
getSensorValues()             // Use scadaBackendService.getSensorValues()

// STILL VALID - keep using
// (Any other functions not listed above are still okay)
```

**Recommendation**:
- ✅ KEEP `iotService.ts` for backward compatibility
- But don't add new code to it
- New code should use `scadaBackendService`
- Gradually migrate remaining functions

---

## Deprecated Frontend Features

### 1. Sample Data / Mock Data
- Old hardcoded sensors and machines
- Mock MQTT data streams
- Sample alarm configurations

**Status**: No longer needed
**Recommendation**: Remove or archive

### 2. Local Backend Routes
- Old API endpoints that existed in embedded backend
- Paths like `/api/mqtt/stats`, `/api/mqtt/reconnect`

**Status**: Replaced by real backend endpoints
**Recommendation**: Remove

### 3. SSH Configuration in Settings
- Old `sshHost`, `sshPort`, `sshUsername` fields
- Used for remote backend connections

**Status**: Deprecated in favor of HTTP/HTTPS
**Recommendation**: Remove from UI

---

## API Endpoint Changes

### Old Endpoints (Embedded Backend)
These no longer exist in the production stack:

```
POST /api/mqtt/reconnect        ❌ Not needed (MQTT auto-reconnects)
GET  /api/mqtt/stats            ❌ Replaced by /api/health
GET  /api/backend/settings      ❌ Not applicable
POST /api/backend/restart       ❌ Use docker-compose restart
```

### New Endpoints (Real Backend)
Use these instead:

```
GET  /api/health                ✅ System health check
GET  /api/version               ✅ Backend version
GET  /api/machines              ✅ All machines
GET  /api/sensors               ✅ All sensors
GET  /api/alarms/active         ✅ Active alarms
WS   /ws/realtime               ✅ Real-time data stream
```

---

## Clean-Up Roadmap

### Phase 1: Mark as Deprecated (✅ DONE)
- Added deprecation notices to old files
- Documented replacement paths
- This document created

### Phase 2: Stop Using (IN PROGRESS)
- All new code uses `scadaBackendService`
- Components updated to use new stack
- Tests updated to use real backend

### Phase 3: Archive (RECOMMENDED)
- Create `git` tag for old version: `legacy-embedded-backend`
- Consider moving to separate branch
- Remove from main `docker-compose.yml`

### Phase 4: Remove (FUTURE)
- Remove files if not needed for reference
- Clean up documentation
- Update all links

---

## Migration Checklist for Developers

If you're adding new features, follow this checklist:

- ❌ Don't import from old `iotService` (unless absolutely necessary)
- ✅ Use `scadaBackendService` for all backend calls
- ❌ Don't add code to `frontend/backend/`
- ✅ Use root `/docker-compose.yml` for running locally
- ❌ Don't hardcode API URLs
- ✅ Use `VITE_BACKEND_URL` environment variable
- ❌ Don't create mock/sample data
- ✅ Use data from real backend via API

---

## Files Safe to Delete

The following files can be safely deleted if no longer needed for reference:

```
❌ frontend/docker-compose.yml              (Use root /docker-compose.yml)
❌ frontend/docker-compose.local.yml        (Use root /docker-compose.yml)
❌ frontend/docker-compose.frontend-only.yml (Use root /docker-compose.yml)
❌ frontend/backend/                        (Old embedded backend)
   ├── server.js
   ├── Dockerfile
   ├── package.json
   ├── package-lock.json
   └── ...
```

**Recommendation**: Archive first, delete later after verification.

---

## Files to Keep

These should be retained even though they're deprecated:

```
✅ iotService.ts - May have functions still in use
✅ database.ts   - IndexedDB management (still needed for boards)
✅ boardService.ts - Board layout persistence (still needed)
```

---

## Environment Variables - Before vs After

### Before (Embedded Backend)
```env
BACKEND_HOST=10.147.18.10
BACKEND_PORT=3002
DATABASE_HOST=db
DATABASE_USER=backend
MQTT_HOST=mosquitto
```

### After (Unified Stack)
```env
VITE_BACKEND_URL=http://backend:8000
VITE_API_TOKEN=token_here
DB_USER=backend
DB_PASSWORD=password
API_TOKEN=token_here
```

---

## Git History Preservation

### Important
⚠️ **DO NOT** delete the old code from git history

If you need to clean up files:

```bash
# Good: Keep history, remove from working tree
git rm --cached frontend/docker-compose.yml
echo "docker-compose.yml" >> .gitignore
git commit -m "Remove old embedded backend compose file"

# Bad: Rewrite history (don't do this)
git filter-branch --tree-filter 'rm -f ...'
```

---

## Support for Legacy Systems

If you have an **old deployment still using the embedded backend**:

### Migration Steps

1. **Backup old data**:
```bash
# Backup old database
docker-compose -f frontend/docker-compose.yml exec db \
  pg_dump -U backend industrial > backup.sql
```

2. **Export configuration**:
   - Save machine YAML files
   - Export board layouts
   - Document custom settings

3. **Deploy new stack**:
```bash
cd ScadaPRO
docker-compose up -d --build
```

4. **Import data**:
   - Upload machine YAML files to `/backend/config/machines/`
   - Import board layouts via UI
   - Reconfigure alarms if needed

5. **Verify**:
   - Check all machines appear
   - Verify sensors reading correctly
   - Test alarm system

---

## Questions & Answers

**Q: Can I still use the old embedded backend?**  
A: Yes, but not recommended. Use the new unified stack instead. See `DOCKER_DEPLOYMENT.md`.

**Q: What if I need the old code?**  
A: It's in git history. Check out a previous commit or tag to see it.

**Q: How do I migrate my custom code?**  
A: See "Migration Checklist for Developers" above. Or reach out for help.

**Q: Will old deployments still work?**  
A: Yes, old docker-compose files still work. But should be migrated to new stack.

**Q: What about my data?**  
A: New backend uses same database schema. Data can be migrated with proper backup/restore.

---

## References

- 📖 [New Deployment Guide](./DOCKER_DEPLOYMENT.md)
- 🔗 [Integration Guide](./FRONTEND_INTEGRATION.md)
- 📋 [Project Summary](./PROJECT_SUMMARY.md)

---

**Last Updated**: January 27, 2025  
**Status**: Deprecation Complete ✅  
**Version**: 1.0
