# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-01-21

### Fixed
- ✅ **Sensor History Endpoint Parameter Compatibility**
  - `/api/sensors/{sensor_identifier}/history` now accepts both numeric sensor ID and string sensor code
  - Frontend can now query with either format:
    - `/api/sensors/1/history` (numeric ID)
    - `/api/sensors/temperatura_medida_sec21/history` (sensor code string)
  - Automatic parameter type detection and appropriate database query routing
  - Returns proper 200 OK responses for both parameter types

## [0.2.0] - 2025-11-28

### Added
- ✅ **MQTT Real-time Statistics**
  - Live tracking of connected machines (count)
  - Live tracking of active sensors (count)
  - Total message count from MQTT broker
  - Messages per second calculation (60-second rolling window)
  - Real-time updates in server status panel

- ✅ **Database Record Tracking**
  - Display total records count in PostgreSQL status
  - Formatted with thousand separators (e.g., 28,567)
  - Updates in real-time from collector metrics

- ✅ **Enhanced Collector API Information**
  - Renamed "Collector API" to "Colector API" (Spanish)
  - Display LAN IP address (eth0) of collector service
  - IP resolution from socket connection method
  - Better visual distinction with cyan color for IP display

- ✅ **Settings Page Improvements**
  - MQTT connection state properly cleaned up when leaving Settings page
  - Removed unnecessary "Refrescar" (Refresh) button from header
  - Better state management for WebSocket connections

- ✅ **System Uptime Fix**
  - Fixed server uptime display (was showing timestamp instead of system uptime)
  - Now correctly shows format like "4 days, 9:44" based on actual host boot time
  - Proper calculation from psutil.boot_time()

### Changed
- Improved MQTT message handling to record machine/sensor/PLC information
- Enhanced ServerStatusPanel to display configurable record save interval
- Better error handling for undefined values in status display (null coalescing operators)

### Technical Details
- Added `MQTTStats` class to track real-time MQTT statistics
- Added `get_collector_ip()` async function using socket connection for accurate IP detection
- Enhanced `on_message` callback to parse and record MQTT metadata
- Database queries now count total records from sensor_data table
- Frontend type definitions updated for new fields (ip, total_records)
- Removed authentication requirement from read-only endpoints (`/api/plcs`, `/api/sensors`, `/api/machines`, etc.)
  - Allows frontend to load configuration data without authentication
  - Maintains security for write operations (POST/PUT/PATCH/DELETE)

## [0.1.0] - 2025-01-27

### Added
- ✅ **Authentication System**
  - Login/logout functionality with demo credentials
  - Role-based access control (admin, operator, viewer)
  - Permission-based feature access
  - Protected routes for sensitive pages
  - Session management with token expiry
  - User info display in sidebar

- ✅ **Frontend-Backend Integration**
  - Unified `scadaBackendService` as single API layer
  - HTTP/REST API endpoints
  - WebSocket real-time streaming support
  - Configurable backend URL via environment variables
  - Comprehensive error handling and retry logic

- ✅ **SCADA Dashboard**
  - Custom board creation and management
  - Widget system (Gauge, LineChart, KPI, Status)
  - Real-time sensor visualization
  - 5-second polling frequency
  - Responsive design for desktop and tablet

- ✅ **Alarm Management**
  - Active/historical alarm tracking
  - Severity levels (critical, high, medium, low)
  - Alarm acknowledgment
  - Real-time notifications
  - Machine-specific alarm filtering

- ✅ **Machine & Sensor Management**
  - Multi-machine support
  - Sensor inventory and monitoring
  - Historical data analysis
  - Machine detail pages with live updates

- ✅ **System Architecture**
  - Clean separation of concerns (Frontend/Backend/DB/MQTT)
  - No legacy code or embedded backend
  - Unified service layer
  - Type-safe TypeScript implementation
  - Docker Compose orchestration (4 services)

- ✅ **Documentation**
  - 12+ comprehensive documentation files (2,750+ lines)
  - Architecture documentation (5 detailed guides)
  - Deployment and integration guides
  - API reference and quick start

### Changed
- Removed embedded Node.js backend from frontend
- Removed legacy docker-compose files
- Consolidated services (removed iotService, mqttService)
- Updated all components to use scadaBackendService

### Technical Details
- **Frontend**: React 18+ with TypeScript, Vite, Tailwind CSS
- **Backend**: FastAPI 0.104+, SQLAlchemy 2.x, Pydantic 2.x
- **Database**: PostgreSQL 15
- **Real-time**: MQTT with Mosquitto broker
- **Containerization**: Docker & Docker Compose 3.9

---

## Release Statistics

| Metric | Value |
|--------|-------|
| Total Files | 148 |
| Lines of Code | 15,000+ |
| API Endpoints | 11+ |
| Components | 20+ |
| Services | 6 |
| Documentation Files | 12+ |
| Documentation Lines | 2,750+ |

---

## Version Display

Current version is displayed in the UI as: **v0.1.0** (visible under the logo in sidebar)

---

## Authentication Demo

**Default Credentials** (for v0.1.0):
- Username: `admin`
- Password: `admin123`

⚠️ **Note**: Change these credentials before deploying to production!

---

## Next Steps (v0.2.0 - Planned)

- [ ] Full WebSocket real-time integration
- [ ] Advanced user management and roles
- [ ] Data export/import functionality
- [ ] Performance optimizations and caching
- [ ] Advanced analytics and reporting
- [ ] Mobile app support
- [ ] Production authentication (OAuth/SAML)

---

## Known Limitations (v0.1.0)

- Demo authentication only (replace with real auth system)
- No user management interface
- Limited to single-server deployment
- No backup/restore functionality
- Basic audit logging

---

## Deployment Notes

See [DOCKER_DEPLOYMENT.md](./doc/DOCKER_DEPLOYMENT.md) for complete deployment guide.

---

**Released**: November 27, 2025  
**Status**: Production Ready  
**License**: Proprietary
