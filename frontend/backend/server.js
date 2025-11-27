const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { Client } = require('ssh2');
const mqtt = require('mqtt');
const WebSocket = require('ws');

const app = express();
const PORT = 3002;
const wsClients = new Set();
const CONFIG_PATH = path.join(__dirname, 'config', 'config.yaml');
const INVENTORY_PATH = path.join(__dirname, 'data', 'inventory.yaml');
const COLLECTOR_PATH = path.join(__dirname, 'config', 'collector.yaml');
const DATA_CONFIG_PATH = path.join(__dirname, 'config', 'data.yaml');

app.use(cors());
app.use(bodyParser.json());

// Helper to read config
const readConfig = () => {
  try {
    const fileContents = fs.readFileSync(CONFIG_PATH, 'utf8');
    return yaml.load(fileContents);
  } catch (e) {
    console.error("Error reading config:", e);
    return { backends: [], dashboards: { metrics: [] } };
  }
};

// Helper to write config
const writeConfig = (data) => {
  try {
    const yamlStr = yaml.dump(data);
    fs.writeFileSync(CONFIG_PATH, yamlStr, 'utf8');
    return true;
  } catch (e) {
    console.error("Error writing config:", e);
    return false;
  }
};

// Helper to read inventory
const readInventory = () => {
  try {
    const fileContents = fs.readFileSync(INVENTORY_PATH, 'utf8');
    return yaml.load(fileContents);
  } catch (e) {
    console.error("Error reading inventory:", e);
    return { machines: [], plcs: [], sensors: [] };
  }
};

// Helper to write inventory
const writeInventory = (data) => {
  try {
    const yamlStr = yaml.dump(data);
    fs.writeFileSync(INVENTORY_PATH, yamlStr, 'utf8');
    return true;
  } catch (e) {
    console.error("Error writing inventory:", e);
    return false;
  }
};

// Helper to read collector config
const readCollectorConfig = () => {
  try {
    const fileContents = fs.readFileSync(COLLECTOR_PATH, 'utf8');
    return yaml.load(fileContents);
  } catch (e) {
    console.error("Error reading collector config:", e);
    return { collector: { host: '', port: 0, token: '', enabled: false } };
  }
};

// Helper to write collector config
const writeCollectorConfig = (data) => {
  try {
    const yamlStr = yaml.dump(data);
    fs.writeFileSync(COLLECTOR_PATH, yamlStr, 'utf8');
    return true;
  } catch (e) {
    console.error("Error writing collector config:", e);
    return false;
  }
};

// Helper to read data config (persistent settings)
const readDataConfig = () => {
  try {
    const fileContents = fs.readFileSync(DATA_CONFIG_PATH, 'utf8');
    return yaml.load(fileContents);
  } catch (e) {
    console.error("Error reading data config:", e);
    return { 
      collector: { host: '10.147.18.10', port: 8000, token: '', enabled: true },
      mqtt: { broker_url: 'mqtt://10.147.18.10:1883', mqtt_host: '10.147.18.10', mqtt_port: 1883, topic: 'machines/#', enabled: true },
      database: { host: '10.147.18.10', port: 5432, user: 'backend', password: 'backend_pass', name: 'industrial', driver: 'postgresql+asyncpg' }
    };
  }
};

// Helper to write data config
const writeDataConfig = (data) => {
  try {
    const yamlStr = yaml.dump(data);
    fs.writeFileSync(DATA_CONFIG_PATH, yamlStr, 'utf8');
    return true;
  } catch (e) {
    console.error("Error writing data config:", e);
    return false;
  }
};

// --- API Endpoints ---

// Helper to get collector config for API proxying
const getCollectorUrl = () => {
  const cfg = readDataConfig();
  return `http://${cfg.collector.host}:${cfg.collector.port}`;
};

const getCollectorToken = () => {
  const cfg = readDataConfig();
  return cfg.collector.token || '';
};

// ============================================
// Proxy to Remote Backend (10.147.18.10:8000)
// ============================================

// Proxy: Get all machines from remote backend
app.get('/api/machines', async (req, res) => {
  try {
    const baseUrl = getCollectorUrl();
    const token = getCollectorToken();
    
    const response = await fetch(`${baseUrl}/api/machines/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch machines: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ error: errorText });
    }
    
    const machines = await response.json();
    res.json(machines);
  } catch (error) {
    console.error('Error proxying /api/machines:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Proxy: Get single machine from remote backend
// Note: Skip 'connected' as it's handled by a later route
app.get('/api/machines/:machineId', async (req, res, next) => {
  const { machineId } = req.params;
  
  // Skip to next route if this is the 'connected' endpoint
  if (machineId === 'connected') {
    return next();
  }
  
  try {
    const baseUrl = getCollectorUrl();
    const token = getCollectorToken();
    
    const response = await fetch(`${baseUrl}/api/machines/${machineId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Machine not found' });
    }
    
    const machine = await response.json();
    res.json(machine);
  } catch (error) {
    console.error('Error proxying /api/machines/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Proxy: Get sensors with MQTT topics from remote backend
app.get('/api/sensors/mqtt-topics', async (req, res) => {
  try {
    const baseUrl = getCollectorUrl();
    const token = getCollectorToken();
    const queryString = new URLSearchParams(req.query).toString();
    
    const url = `${baseUrl}/api/sensors/mqtt-topics${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch sensors' });
    }
    
    const sensors = await response.json();
    res.json(sensors);
  } catch (error) {
    console.error('Error proxying /api/sensors/mqtt-topics:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Proxy: Get sensor history from remote backend (PostgreSQL)
app.get('/api/sensors/history/:sensorCode', async (req, res) => {
  try {
    const baseUrl = getCollectorUrl();
    const token = getCollectorToken();
    const { sensorCode } = req.params;
    const hours = parseInt(req.query.hours) || 24;
    
    // Calculate 'from' and 'to' timestamps
    const now = new Date();
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const toParam = now.toISOString().replace('Z', '');
    const fromParam = from.toISOString().replace('Z', '');
    
    // First, we need to get the sensor ID from the code
    // Try to get sensors and find the matching one
    const sensorsResponse = await fetch(`${baseUrl}/api/sensors/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(10000)
    });
    
    if (!sensorsResponse.ok) {
      return res.status(sensorsResponse.status).json({ error: 'Failed to fetch sensors' });
    }
    
    const sensors = await sensorsResponse.json();
    const sensor = sensors.find(s => s.code === sensorCode);
    
    if (!sensor) {
      return res.status(404).json({ error: `Sensor ${sensorCode} not found`, history: [] });
    }
    
    // Now get the history for this sensor using 'from' and 'to' params
    const historyUrl = `${baseUrl}/api/sensors/${sensor.id}/history?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}`;
    const historyResponse = await fetch(historyUrl, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(30000)
    });
    
    if (!historyResponse.ok) {
      const errorText = await historyResponse.text();
      console.error('History fetch error:', errorText);
      return res.status(historyResponse.status).json({ error: 'Failed to fetch history', details: errorText, history: [] });
    }
    
    let history = await historyResponse.json();
    
    // The remote API may ignore the date filter, so we filter here to ensure only data within the requested range
    if (Array.isArray(history) && history.length > 0) {
      const fromTimestamp = from.getTime();
      const toTimestamp = now.getTime();
      
      history = history.filter(item => {
        const itemTime = new Date(item.timestamp).getTime();
        return itemTime >= fromTimestamp && itemTime <= toTimestamp;
      });
      
      // Sort by timestamp ascending
      history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      console.log(`History for ${sensorCode}: requested ${hours}h, got ${history.length} records after filtering`);
    }
    
    res.json({ 
      sensorCode,
      sensorId: sensor.id,
      sensorName: sensor.name,
      unit: sensor.unit,
      requestedHours: hours,
      from: fromParam,
      to: toParam,
      history: Array.isArray(history) ? history : []
    });
  } catch (error) {
    console.error('Error fetching sensor history:', error.message);
    res.status(500).json({ error: error.message, history: [] });
  }
});

// Proxy: Health check to remote backend
app.get('/api/health', async (req, res) => {
  try {
    const baseUrl = getCollectorUrl();
    const token = getCollectorToken();
    
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return res.json({ status: 'error', remote: false, local: true });
    }
    
    const data = await response.json();
    res.json({ ...data, remote: true, local: true });
  } catch (error) {
    res.json({ status: 'ok', remote: false, local: true, error: error.message });
  }
});

// Proxy: Version from remote backend
app.get('/api/version', async (req, res) => {
  try {
    const baseUrl = getCollectorUrl();
    const token = getCollectorToken();
    
    const response = await fetch(`${baseUrl}/api/version`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return res.json({ version: 'local-only', remote: null });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.json({ version: 'local-only', error: error.message });
  }
});

// ============================================
// Local API Endpoints
// ============================================

// Get all configuration
app.get('/api/config', (req, res) => {
  const config = readConfig();
  res.json(config);
});

// Get PLCs
app.get('/api/plcs', (req, res) => {
  const inventory = readInventory();
  res.json(inventory.plcs || []);
});

// Get Sensors
app.get('/api/sensors', (req, res) => {
  const inventory = readInventory();
  res.json(inventory.sensors || []);
});

// Get Backends
app.get('/api/backends', (req, res) => {
  const config = readConfig();
  res.json(config.backends || []);
});

// Add/Update Backend
app.post('/api/backends', (req, res) => {
  const config = readConfig();
  const newBackend = req.body;

  const index = config.backends.findIndex(b => b.id === newBackend.id);
  if (index >= 0) {
    config.backends[index] = newBackend;
  } else {
    config.backends.push(newBackend);
  }

  if (writeConfig(config)) {
    res.json(newBackend);
  } else {
    res.status(500).json({ error: "Failed to save config" });
  }
});

// Delete Backend
app.delete('/api/backends/:id', (req, res) => {
  const config = readConfig();
  config.backends = config.backends.filter(b => b.id !== req.params.id);

  if (writeConfig(config)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: "Failed to save config" });
  }
});

// Get Dashboard Metrics
app.get('/api/dashboard/metrics', (req, res) => {
  const config = readConfig();
  res.json(config.dashboards?.metrics || []);
});

// Get Machine Layout
app.get('/api/layouts/:machineId', (req, res) => {
  const config = readConfig();
  const { machineId } = req.params;

  const layout = config.layouts?.[machineId] || config.layouts?.default;

  if (layout) {
    const widgets = layout.widgets.map(w => ({ ...w, machineId }));
    res.json({ machineId, widgets });
  } else {
    res.status(404).json({ error: "Layout not found" });
  }
});

// Add Dashboard Metric
app.post('/api/dashboard/metrics', (req, res) => {
  const config = readConfig();
  const newMetric = req.body;

  if (!config.dashboards) config.dashboards = {};
  if (!config.dashboards.metrics) config.dashboards.metrics = [];

  config.dashboards.metrics.push(newMetric);

  if (writeConfig(config)) {
    res.json(newMetric);
  } else {
    res.status(500).json({ error: "Failed to save config" });
  }
});

// Update Dashboard Metric
app.put('/api/dashboard/metrics/:id', (req, res) => {
  const config = readConfig();
  const { id } = req.params;
  const updates = req.body;

  if (config.dashboards && config.dashboards.metrics) {
    const index = config.dashboards.metrics.findIndex(m => m.id === id);
    if (index !== -1) {
      config.dashboards.metrics[index] = { ...config.dashboards.metrics[index], ...updates };
      if (writeConfig(config)) {
        return res.json(config.dashboards.metrics[index]);
      }
    }
  }
  res.status(500).json({ error: "Failed to update metric" });
});

// Delete Dashboard Metric
app.delete('/api/dashboard/metrics/:id', (req, res) => {
  const config = readConfig();
  const { id } = req.params;

  if (config.dashboards && config.dashboards.metrics) {
    config.dashboards.metrics = config.dashboards.metrics.filter(m => m.id !== id);
    if (writeConfig(config)) {
      return res.json({ success: true });
    }
  }
  res.status(500).json({ error: "Failed to delete metric" });
});

// --- Industrial IoT API Implementation (Persistent Data) ---

// System Status
app.get('/api/health', (req, res) => {
  res.json({ status: "ok" });
});

app.get('/api/version', (req, res) => {
  res.json({ version: "0.4.0" });
});

// ============================================
// Data Config API (Persistent settings in data.yaml)
// ============================================

// Get persistent configuration
app.get('/api/data-config', (req, res) => {
  const config = readDataConfig();
  res.json(config);
});

// Save persistent configuration
app.post('/api/data-config', (req, res) => {
  try {
    const newConfig = req.body;
    
    // Validate required fields
    if (!newConfig.collector?.host) {
      return res.status(400).json({ success: false, error: 'Collector host is required' });
    }
    
    // Merge with defaults
    const config = {
      collector: {
        host: newConfig.collector?.host || '10.147.18.10',
        port: newConfig.collector?.port || 8000,
        token: newConfig.collector?.token || '',
        enabled: newConfig.collector?.enabled ?? true
      },
      mqtt: {
        broker_url: newConfig.mqtt?.broker_url || `mqtt://${newConfig.collector?.host || '10.147.18.10'}:1883`,
        mqtt_host: newConfig.mqtt?.mqtt_host || newConfig.collector?.host || '10.147.18.10',
        mqtt_port: newConfig.mqtt?.mqtt_port || 1883,
        topic: newConfig.mqtt?.topic || 'machines/#',
        enabled: newConfig.mqtt?.enabled ?? true
      },
      database: {
        host: newConfig.database?.host || newConfig.collector?.host || '10.147.18.10',
        port: newConfig.database?.port || 5432,
        user: newConfig.database?.user || 'backend',
        password: newConfig.database?.password || 'backend_pass',
        name: newConfig.database?.name || 'industrial',
        driver: newConfig.database?.driver || 'postgresql+asyncpg'
      }
    };
    
    if (writeDataConfig(config)) {
      console.log('✅ Data config saved:', JSON.stringify(config, null, 2));
      
      // Also update the local collectorConfig and reconnect MQTT
      loadCollectorConfig();
      if (config.mqtt.enabled) {
        connectToMQTT();
      }
      
      res.json({ success: true, config });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save configuration' });
    }
  } catch (error) {
    console.error('Error saving data config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Connection Tests
// ============================================

// Test Collector (API) connection
app.post('/api/test/collector', async (req, res) => {
  try {
    const { host, port, token } = req.body;
    
    if (!host) {
      return res.status(400).json({ success: false, error: 'Host is required' });
    }
    
    const baseUrl = `http://${host}:${port || 8000}`;
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    console.log(`🔍 Testing collector connection to ${baseUrl}...`);
    
    const startTime = Date.now();
    const response = await fetch(`${baseUrl}/api/health`, { 
      headers,
      signal: AbortSignal.timeout(5000)
    });
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      res.json({ 
        success: true, 
        status: 'online',
        latency,
        data
      });
    } else if (response.status === 401 || response.status === 403) {
      res.json({ 
        success: false, 
        status: 'auth_error',
        error: 'Token de autenticación inválido o faltante',
        latency
      });
    } else {
      res.json({ 
        success: false, 
        status: 'error',
        error: `HTTP ${response.status}: ${response.statusText}`,
        latency
      });
    }
  } catch (error) {
    console.error('Collector test error:', error.message);
    res.json({ 
      success: false, 
      status: 'offline',
      error: error.message || 'No se pudo conectar al collector'
    });
  }
});

// Test MQTT connection
app.post('/api/test/mqtt', async (req, res) => {
  try {
    const { mqtt_host, mqtt_port } = req.body;
    
    if (!mqtt_host) {
      return res.status(400).json({ success: false, error: 'MQTT host is required' });
    }
    
    const mqttUrl = `mqtt://${mqtt_host}:${mqtt_port || 1883}`;
    console.log(`🔍 Testing MQTT connection to ${mqttUrl}...`);
    
    // Create a temporary MQTT client to test connection
    const testClient = mqtt.connect(mqttUrl, {
      connectTimeout: 5000,
      reconnectPeriod: 0 // Don't reconnect for test
    });
    
    const result = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        testClient.end();
        resolve({ success: false, status: 'timeout', error: 'Connection timeout' });
      }, 5000);
      
      testClient.on('connect', () => {
        clearTimeout(timeout);
        testClient.end();
        resolve({ success: true, status: 'online' });
      });
      
      testClient.on('error', (err) => {
        clearTimeout(timeout);
        testClient.end();
        resolve({ success: false, status: 'error', error: err.message });
      });
    });
    
    res.json(result);
  } catch (error) {
    console.error('MQTT test error:', error.message);
    res.json({ 
      success: false, 
      status: 'error',
      error: error.message || 'Error al probar conexión MQTT'
    });
  }
});

// Test Database connection
app.post('/api/test/database', async (req, res) => {
  try {
    const { host, port, user, password, name } = req.body;
    
    if (!host) {
      return res.status(400).json({ success: false, error: 'Database host is required' });
    }
    
    // Note: For a real database test, you'd need pg client
    // Here we'll just check if the port is reachable
    const net = require('net');
    const dbPort = port || 5432;
    
    console.log(`🔍 Testing database connection to ${host}:${dbPort}...`);
    
    const result = await new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ success: false, status: 'timeout', error: 'Connection timeout' });
      }, 5000);
      
      socket.connect(dbPort, host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ 
          success: true, 
          status: 'reachable',
          message: `Puerto ${dbPort} accesible en ${host}. La conexión real requiere credenciales válidas.`
        });
      });
      
      socket.on('error', (err) => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ 
          success: false, 
          status: 'error',
          error: err.message
        });
      });
    });
    
    res.json(result);
  } catch (error) {
    console.error('Database test error:', error.message);
    res.json({ 
      success: false, 
      status: 'error',
      error: error.message || 'Error al probar conexión de base de datos'
    });
  }
});

// Get current connection status summary
app.get('/api/connection-status', async (req, res) => {
  const config = readDataConfig();
  const status = {
    collector: { status: 'unknown' },
    mqtt: { status: 'unknown' },
    database: { status: 'unknown' }
  };
  
  // Test Collector
  try {
    const baseUrl = `http://${config.collector.host}:${config.collector.port}`;
    const headers = config.collector.token ? { 'Authorization': `Bearer ${config.collector.token}` } : {};
    const response = await fetch(`${baseUrl}/api/health`, { 
      headers,
      signal: AbortSignal.timeout(3000)
    });
    status.collector = { 
      status: response.ok ? 'online' : 'error',
      code: response.status
    };
  } catch (e) {
    status.collector = { status: 'offline', error: e.message };
  }
  
  // MQTT status from current connection with detailed info
  const machineCount = Object.keys(mqttRegistry.machines).length;
  const sensorCount = Object.values(mqttRegistry.machines).reduce((sum, m) => sum + m.sensors.size, 0);
  status.mqtt = { 
    status: mqttClient && mqttClient.connected ? 'online' : 'offline',
    machines: machineCount,
    sensors: sensorCount,
    totalMessages: mqttRegistry.totalMessages,
    uptime: Math.floor((Date.now() - mqttRegistry.startTime.getTime()) / 1000)
  };
  
  // Database - just check port reachability
  try {
    const net = require('net');
    const dbHost = config.database.host;
    const dbPort = config.database.port || 5432;
    
    const dbResult = await new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ status: 'timeout' });
      }, 3000);
      
      socket.connect(dbPort, dbHost, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ status: 'reachable' });
      });
      
      socket.on('error', (err) => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ status: 'error', error: err.message });
      });
    });
    
    status.database = dbResult;
  } catch (e) {
    status.database = { status: 'error', error: e.message };
  }
  
  res.json(status);
});

// ============================================
// Connected Machines & Sensors (from MQTT registry)
// ============================================

// Get all connected machines with their sensors
app.get('/api/machines/connected', (req, res) => {
  const machines = Object.entries(mqttRegistry.machines).map(([code, data]) => ({
    code,
    plcCode: data.plcCode,
    sensors: Array.from(data.sensors),
    sensorCount: data.sensors.size,
    lastSeen: data.lastSeen,
    messageCount: data.messageCount,
    isActive: (Date.now() - data.lastSeen.getTime()) < 30000 // Active if seen in last 30 seconds
  }));
  
  // Sort by most recently active
  machines.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  
  res.json({
    machines,
    summary: {
      totalMachines: machines.length,
      activeMachines: machines.filter(m => m.isActive).length,
      totalSensors: machines.reduce((sum, m) => sum + m.sensorCount, 0),
      totalMessages: mqttRegistry.totalMessages,
      uptime: Math.floor((Date.now() - mqttRegistry.startTime.getTime()) / 1000)
    }
  });
});

// Get MQTT statistics
app.get('/api/mqtt/stats', (req, res) => {
  const isConnected = mqttClient && mqttClient.connected;
  const machines = Object.entries(mqttRegistry.machines).map(([code, data]) => ({
    code,
    plcCode: data.plcCode,
    sensors: Array.from(data.sensors),
    sensorCount: data.sensors.size,
    lastSeen: data.lastSeen,
    messageCount: data.messageCount
  }));
  
  res.json({
    connected: isConnected,
    broker: `mqtt://${collectorConfig.mqtt.mqtt_host}:${collectorConfig.mqtt.mqtt_port}`,
    topic: collectorConfig.mqtt.topic,
    machines,
    stats: {
      machineCount: machines.length,
      sensorCount: machines.reduce((sum, m) => sum + m.sensorCount, 0),
      totalMessages: mqttRegistry.totalMessages,
      startTime: mqttRegistry.startTime,
      uptime: Math.floor((Date.now() - mqttRegistry.startTime.getTime()) / 1000)
    }
  });
});

// Get all sensor values in real-time
app.get('/api/sensors/values', (req, res) => {
  // Add flash: false to each sensor for frontend compatibility
  const sensorsWithFlash = {};
  for (const [code, data] of Object.entries(mqttRegistry.sensorValues)) {
    sensorsWithFlash[code] = {
      ...data,
      flash: false
    };
  }
  res.json({
    sensors: sensorsWithFlash,
    count: Object.keys(sensorsWithFlash).length,
    timestamp: Date.now()
  });
});

// ============================================
// Server Status & System Metrics
// ============================================

// Get comprehensive server status
app.get('/api/server/status', async (req, res) => {
  const os = require('os');
  const config = readDataConfig();
  
  // Calculate CPU usage
  const cpus = os.cpus();
  const cpuCount = cpus.length;
  let totalIdle = 0, totalTick = 0;
  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  const cpuUsage = Math.round((1 - totalIdle / totalTick) * 100);
  
  // Memory info
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = Math.round((usedMem / totalMem) * 100);
  
  // Process memory
  const processMemory = process.memoryUsage();
  
  // Uptime
  const serverUptime = Math.floor((Date.now() - mqttRegistry.startTime.getTime()) / 1000);
  const systemUptime = os.uptime();
  
  // MQTT Status
  const mqttConnected = mqttClient && mqttClient.connected;
  const machineCount = Object.keys(mqttRegistry.machines).length;
  const sensorCount = Object.values(mqttRegistry.machines).reduce((sum, m) => sum + m.sensors.size, 0);
  
  // Database status check
  let databaseStatus = { status: 'unknown', reachable: false };
  try {
    const net = require('net');
    const dbHost = config.database?.host || '10.147.18.10';
    const dbPort = config.database?.port || 5432;
    
    databaseStatus = await new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ status: 'timeout', reachable: false });
      }, 3000);
      
      socket.connect(dbPort, dbHost, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ status: 'online', reachable: true });
      });
      
      socket.on('error', (err) => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ status: 'error', reachable: false, error: err.message });
      });
    });
  } catch (e) {
    databaseStatus = { status: 'error', reachable: false, error: e.message };
  }
  
  // Collector API status
  let collectorStatus = { status: 'unknown', reachable: false };
  try {
    const baseUrl = `http://${config.collector?.host || '10.147.18.10'}:${config.collector?.port || 8000}`;
    const headers = config.collector?.token ? { 'Authorization': `Bearer ${config.collector.token}` } : {};
    const startTime = Date.now();
    const response = await fetch(`${baseUrl}/api/health`, { 
      headers,
      signal: AbortSignal.timeout(3000)
    });
    const latency = Date.now() - startTime;
    collectorStatus = { 
      status: response.ok ? 'online' : 'error', 
      reachable: response.ok,
      latency,
      code: response.status
    };
  } catch (e) {
    collectorStatus = { status: 'offline', reachable: false, error: e.message };
  }
  
  res.json({
    server: {
      name: 'Industrial SCADA Backend',
      version: '1.0.0',
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: serverUptime,
      startTime: mqttRegistry.startTime
    },
    system: {
      cpuCount,
      cpuUsage,
      cpuModel: cpus[0]?.model || 'Unknown',
      totalMemory: totalMem,
      freeMemory: freeMem,
      usedMemory: usedMem,
      memoryUsage: memUsage,
      systemUptime,
      loadAverage: os.loadavg()
    },
    process: {
      pid: process.pid,
      heapUsed: processMemory.heapUsed,
      heapTotal: processMemory.heapTotal,
      external: processMemory.external,
      rss: processMemory.rss
    },
    mqtt: {
      status: mqttConnected ? 'online' : 'offline',
      connected: mqttConnected,
      broker: `mqtt://${config.mqtt?.mqtt_host}:${config.mqtt?.mqtt_port}`,
      topic: config.mqtt?.topic,
      machines: machineCount,
      sensors: sensorCount,
      totalMessages: mqttRegistry.totalMessages,
      messagesPerSecond: serverUptime > 0 ? Math.round(mqttRegistry.totalMessages / serverUptime * 10) / 10 : 0
    },
    database: {
      ...databaseStatus,
      host: config.database?.host,
      port: config.database?.port,
      name: config.database?.name,
      user: config.database?.user
    },
    collector: {
      ...collectorStatus,
      host: config.collector?.host,
      port: config.collector?.port,
      enabled: config.collector?.enabled
    },
    connections: {
      websocketClients: wsClients.size
    }
  });
});

// Collector Configuration (Full collector.yaml)
app.get('/api/collector', (req, res) => {
  const config = readCollectorConfig();
  // Return the full config with both collector and mqtt sections
  res.json({
    collector: config.collector || { host: '', port: 8000, token: '', enabled: false },
    mqtt: config.mqtt || { broker_url: '', mqtt_host: '', mqtt_port: 1883, topic: 'plc/#', enabled: false }
  });
});

app.post('/api/collector', (req, res) => {
  try {
    const { collector, mqtt } = req.body;
    
    // Build the complete config object
    const newConfig = {
      collector: collector || { host: '', port: 8000, token: '', enabled: false },
      mqtt: mqtt || { broker_url: '', mqtt_host: '', mqtt_port: 1883, topic: 'plc/#', enabled: false }
    };
    
    if (writeCollectorConfig(newConfig)) {
      console.log('✅ Collector config saved:', JSON.stringify(newConfig, null, 2));
      // Reload MQTT connection with new settings
      loadCollectorConfig();
      if (newConfig.mqtt.enabled) {
        connectToMQTT();
      }
      res.json({ success: true, ...newConfig });
    } else {
      res.status(500).json({ success: false, error: "Failed to save collector config" });
    }
  } catch (error) {
    console.error("Error saving collector config:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/collector/sync', async (req, res) => {
  try {
    const config = readCollectorConfig();
    const collector = config.collector;
    
    if (!collector || !collector.host) {
      return res.status(400).json({ error: "Collector host not configured" });
    }

    const baseUrl = `http://${collector.host}:${collector.port || 8000}`;
    const token = collector.token;
    
    console.log(`🔄 Syncing inventory from ${baseUrl}...`);

    // Fetch Machines
    const machinesRes = await fetch(`${baseUrl}/api/machines/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!machinesRes.ok) throw new Error(`Failed to fetch machines: ${machinesRes.statusText}`);
    const machines = await machinesRes.json();

    // Fetch PLCs
    const plcsRes = await fetch(`${baseUrl}/api/plcs/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!plcsRes.ok) throw new Error(`Failed to fetch PLCs: ${plcsRes.statusText}`);
    const plcs = await plcsRes.json();

    // Fetch Sensors
    const sensorsRes = await fetch(`${baseUrl}/api/sensors/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!sensorsRes.ok) throw new Error(`Failed to fetch sensors: ${sensorsRes.statusText}`);
    const sensors = await sensorsRes.json();

    // Save to inventory.yaml
    const inventory = { machines, plcs, sensors };
    if (writeInventory(inventory)) {
      console.log(`✅ Inventory synced: ${machines.length} machines, ${plcs.length} plcs, ${sensors.length} sensors`);
      res.json({ success: true, message: `Synced ${sensors.length} sensors` });
    } else {
      throw new Error("Failed to write inventory file");
    }

  } catch (error) {
    console.error("❌ Sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Save inventory manually (PLCs and Sensors)
app.post('/api/inventory/save', (req, res) => {
  try {
    const { plcs, sensors, machines } = req.body;
    const currentInventory = readInventory();
    
    const newInventory = {
      machines: machines || currentInventory.machines || [],
      plcs: plcs || currentInventory.plcs || [],
      sensors: sensors || currentInventory.sensors || []
    };
    
    if (writeInventory(newInventory)) {
      console.log(`✅ Inventory saved: ${newInventory.plcs.length} PLCs, ${newInventory.sensors.length} sensors`);
      res.json({ 
        success: true, 
        message: `Saved ${newInventory.plcs.length} PLCs and ${newInventory.sensors.length} sensors` 
      });
    } else {
      throw new Error("Failed to write inventory file");
    }
  } catch (error) {
    console.error("❌ Save inventory error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a single PLC
app.put('/api/plcs/:id', (req, res) => {
  try {
    const inventory = readInventory();
    const plcId = parseInt(req.params.id) || req.params.id;
    const updates = req.body;
    
    const index = inventory.plcs.findIndex(p => p.id === plcId || String(p.id) === String(plcId));
    if (index === -1) {
      return res.status(404).json({ error: "PLC not found" });
    }
    
    inventory.plcs[index] = { ...inventory.plcs[index], ...updates };
    
    if (writeInventory(inventory)) {
      res.json(inventory.plcs[index]);
    } else {
      throw new Error("Failed to save inventory");
    }
  } catch (error) {
    console.error("❌ Update PLC error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a single Sensor
app.put('/api/sensors/:id', (req, res) => {
  try {
    const inventory = readInventory();
    const sensorId = parseInt(req.params.id) || req.params.id;
    const updates = req.body;
    
    const index = inventory.sensors.findIndex(s => s.id === sensorId || String(s.id) === String(sensorId));
    if (index === -1) {
      return res.status(404).json({ error: "Sensor not found" });
    }
    
    inventory.sensors[index] = { ...inventory.sensors[index], ...updates };
    
    if (writeInventory(inventory)) {
      res.json(inventory.sensors[index]);
    } else {
      throw new Error("Failed to save inventory");
    }
  } catch (error) {
    console.error("❌ Update Sensor error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get inventory stats
app.get('/api/inventory/stats', (req, res) => {
  const inventory = readInventory();
  res.json({
    machines: inventory.machines?.length || 0,
    plcs: inventory.plcs?.length || 0,
    sensors: inventory.sensors?.length || 0,
    lastModified: fs.statSync(INVENTORY_PATH).mtime
  });
});

// Get database stats from remote collector (PostgreSQL)
app.get('/api/database/stats', async (req, res) => {
  try {
    const config = readCollectorConfig();
    const collector = config.collector;
    
    if (!collector || !collector.host || !collector.enabled) {
      return res.json({
        connected: false,
        error: "Collector not configured or disabled",
        local: getLocalStats()
      });
    }

    const baseUrl = `http://${collector.host}:${collector.port || 8000}`;
    const token = collector.token;
    
    // Try multiple endpoints to get database stats
    let dbStats = null;
    let inventoryStats = null;
    
    // 1. Try /api/db/stats/ endpoint for PostgreSQL stats
    try {
      const dbResponse = await fetch(`${baseUrl}/api/db/stats/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(5000)
      });
      if (dbResponse.ok) {
        dbStats = await dbResponse.json();
      }
    } catch (e) {
      console.log('No /api/db/stats/ endpoint');
    }
    
    // 2. Try /api/stats/ endpoint
    if (!dbStats) {
      try {
        const statsResponse = await fetch(`${baseUrl}/api/stats/`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(5000)
        });
        if (statsResponse.ok) {
          dbStats = await statsResponse.json();
        }
      } catch (e) {
        console.log('No /api/stats/ endpoint');
      }
    }
    
    // 3. Try /api/readings/stats/ for historical data stats
    try {
      const readingsResponse = await fetch(`${baseUrl}/api/readings/stats/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(5000)
      });
      if (readingsResponse.ok) {
        const readingsStats = await readingsResponse.json();
        dbStats = { ...dbStats, ...readingsStats };
      }
    } catch (e) {
      console.log('No /api/readings/stats/ endpoint');
    }
    
    // 4. Get inventory counts
    try {
      const [machinesRes, plcsRes, sensorsRes] = await Promise.all([
        fetch(`${baseUrl}/api/machines/`, { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(5000) }),
        fetch(`${baseUrl}/api/plcs/`, { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(5000) }),
        fetch(`${baseUrl}/api/sensors/`, { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(5000) })
      ]);
      
      const machines = machinesRes.ok ? await machinesRes.json() : [];
      const plcs = plcsRes.ok ? await plcsRes.json() : [];
      const sensors = sensorsRes.ok ? await sensorsRes.json() : [];
      
      inventoryStats = {
        machines: Array.isArray(machines) ? machines.length : 0,
        plcs: Array.isArray(plcs) ? plcs.length : 0,
        sensors: Array.isArray(sensors) ? sensors.length : 0
      };
    } catch (e) {
      console.log('Error getting inventory counts:', e.message);
    }
    
    res.json({
      connected: true,
      database: dbStats || { status: 'unknown' },
      inventory: inventoryStats || { machines: 0, plcs: 0, sensors: 0 },
      local: getLocalStats()
    });
    
  } catch (error) {
    console.error("❌ Database stats error:", error.message);
    res.json({
      connected: false,
      error: error.message,
      local: getLocalStats()
    });
  }
});

// Helper function to get local stats
function getLocalStats() {
  try {
    const inventory = readInventory();
    const inventoryStat = fs.statSync(INVENTORY_PATH);
    const configStat = fs.statSync(CONFIG_PATH);
    const collectorStat = fs.statSync(COLLECTOR_PATH);
    
    return {
      machines: inventory.machines?.length || 0,
      plcs: inventory.plcs?.length || 0,
      sensors: inventory.sensors?.length || 0,
      files: {
        inventory: {
          size: inventoryStat.size,
          modified: inventoryStat.mtime
        },
        config: {
          size: configStat.size,
          modified: configStat.mtime
        },
        collector: {
          size: collectorStat.size,
          modified: collectorStat.mtime
        }
      }
    };
  } catch (e) {
    return { machines: 0, plcs: 0, sensors: 0 };
  }
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

const wss = new WebSocket.Server({ server, path: '/mqtt-ws' });

console.log('WebSocket MQTT Proxy available at ws://localhost:' + PORT + '/mqtt-ws');

// Load Collector Config
let collectorConfig = { mqtt: { mqtt_host: 'localhost', mqtt_port: 1883, topic: 'plc/#' } };
const loadCollectorConfig = () => {
  try {
    const fileContents = fs.readFileSync(COLLECTOR_PATH, 'utf8');
    const parsed = yaml.load(fileContents);
    if (parsed) collectorConfig = parsed;
  } catch (e) {
    console.error("Error reading collector config:", e);
  }
};
loadCollectorConfig();

let mqttClient = null;

// Registry of connected machines and sensors from MQTT messages
const mqttRegistry = {
  machines: {},  // { machine_code: { sensors: Set, lastSeen: Date, messageCount: number } }
  sensorValues: {}, // { sensor_code: { value, unit, machineCode, plcCode, timestamp } }
  totalMessages: 0,
  startTime: new Date()
};

// Parse MQTT topic to extract machine and sensor info
// Expected format: machines/{machine_code}/{plc_code}/{sensor_code}
const parseMqttTopic = (topic) => {
  const parts = topic.split('/');
  if (parts.length >= 3 && parts[0] === 'machines') {
    return {
      machineCode: parts[1],
      plcCode: parts[2] || null,
      sensorCode: parts[3] || null
    };
  }
  return null;
};

// Update registry with new message
const updateMqttRegistry = (topic, payload) => {
  const parsed = parseMqttTopic(topic);
  if (!parsed) return;
  
  const { machineCode, plcCode, sensorCode } = parsed;
  
  if (!mqttRegistry.machines[machineCode]) {
    mqttRegistry.machines[machineCode] = {
      plcCode: plcCode,
      sensors: new Set(),
      lastSeen: new Date(),
      messageCount: 0
    };
  }
  
  const machine = mqttRegistry.machines[machineCode];
  machine.lastSeen = new Date();
  machine.messageCount++;
  if (sensorCode) {
    machine.sensors.add(sensorCode);
    
    // Store current sensor value
    let value = payload;
    let unit = '';
    let display_value = null;
    let raw_value = null;
    try {
      if (typeof payload === 'string') {
        const parsed = JSON.parse(payload);
        value = parsed.value ?? parsed.val ?? parsed.v ?? parsed;
        unit = parsed.unit || '';
        display_value = parsed.display_value || null;
        raw_value = parsed.raw_value ?? null;
      } else if (typeof payload === 'object' && payload !== null) {
        value = payload.value ?? payload.val ?? payload.v ?? payload;
        unit = payload.unit || '';
        display_value = payload.display_value || null;
        raw_value = payload.raw_value ?? null;
      }
    } catch (e) {
      // payload is not JSON, use as-is
    }
    
    mqttRegistry.sensorValues[sensorCode] = {
      value,
      unit,
      machineCode,
      plcCode,
      timestamp: Date.now(),
      display_value,
      raw_value
    };
  }
  mqttRegistry.totalMessages++;
};

const connectToMQTT = () => {
  if (mqttClient) {
    console.log('Disconnecting previous MQTT client...');
    mqttClient.end();
  }

  const mqttUrl = `mqtt://${collectorConfig.mqtt.mqtt_host}:${collectorConfig.mqtt.mqtt_port}`;
  console.log(`Connecting to MQTT Broker at ${mqttUrl}...`);

  mqttClient = mqtt.connect(mqttUrl);

  mqttClient.on('connect', () => {
    console.log('✅ Backend connected to MQTT broker');

    // Subscribe to configured topic
    const topic = collectorConfig.mqtt.topic || 'plc/#';
    mqttClient.subscribe(topic, (err) => {
      if (err) {
        console.error(`Failed to subscribe to ${topic}:`, err);
      } else {
        console.log(`✅ Subscribed to MQTT topic: ${topic}`);
      }
    });
  });

  mqttClient.on('message', (topic, message) => {
    let payload;
    const messageStrRaw = message.toString();
    
    try {
      payload = JSON.parse(messageStrRaw);
    } catch (e) {
      // If not JSON, treat as string/raw value
      payload = messageStrRaw;
    }

    // Update machine registry with payload for sensor values
    try {
      updateMqttRegistry(topic, payload);
    } catch (error) {
      console.error('Error updating MQTT registry:', error);
      return;
    }
    
    // Log only occasionally to reduce noise (every 100 messages)
    if (mqttRegistry.totalMessages % 100 === 0) {
      console.log(`📨 MQTT: ${mqttRegistry.totalMessages} messages, ${Object.keys(mqttRegistry.machines).length} machines active`);
    }

    // Forward to all connected WebSocket clients
    try {
      const wsMessage = JSON.stringify({ topic, payload });
      wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(wsMessage);
        }
      });
    } catch (error) {
      console.error('Error forwarding MQTT message to WebSocket clients:', error);
    }
  });

  mqttClient.on('error', (error) => {
    console.error('❌ MQTT connection error:', error);
  });

  mqttClient.on('close', () => {
    console.log('🔌 MQTT connection closed');
  });

  mqttClient.on('reconnect', () => {
    console.log('🔄 Reconnecting to MQTT broker...');
  });
};

connectToMQTT();

// MQTT Configuration
app.get('/api/mqtt/config', (req, res) => {
  const config = readCollectorConfig();
  res.json(config.mqtt || { broker_url: '', topic: '', enabled: false });
});

app.post('/api/mqtt/config', (req, res) => {
  try {
    const config = readCollectorConfig();
    config.mqtt = req.body;

    if (writeCollectorConfig(config)) {
      // Reload config and reconnect
      loadCollectorConfig();
      connectToMQTT();
      res.json(config.mqtt);
    } else {
      res.status(500).json({ error: "Failed to save MQTT config" });
    }
  } catch (error) {
    console.error("Error saving MQTT config:", error);
    res.status(500).json({ error: error.message });
  }
});

// Reconnect MQTT
app.post('/api/mqtt/reconnect', (req, res) => {
  try {
    connectToMQTT();
    res.json({ message: "MQTT reconnection initiated" });
  } catch (error) {
    console.error("Error reconnecting MQTT:", error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔗 New WebSocket client connected');
  wsClients.add(ws);

  // Send connection confirmation
  ws.send(JSON.stringify({ type: 'connected', message: 'Connected to MQTT Proxy' }));

  ws.on('close', () => {
    console.log('👋 WebSocket client disconnected');
    wsClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(ws);
  });
});
