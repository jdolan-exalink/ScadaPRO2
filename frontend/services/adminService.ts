/**
 * Admin Service - Backend Administration API Client
 * 
 * Provides administrative functions including:
 * - System health and version checks
 * - PLC and sensor management
 * - Machine configuration management
 * - System logs access
 * 
 * API Documentation: http://localhost:8000/docs
 */

import { 
  BackendConnection, 
  PLC, 
  PLCUpdate,
  Sensor, 
  SensorWithMQTT,
  HistoryDatapoint,
  SystemLog, 
  LogsQueryParams,
  MachineConfigFile,
  MachineConfigUpdate,
  ExportConfiguration,
  APIHealthResponse,
  APIVersionResponse
} from '../types';

// ============================================
// Storage Keys
// ============================================
const STORAGE_KEYS = {
  BACKEND_URL: 'scada_backend_url',
  API_TOKEN: 'scada_api_token',
  COLLECTOR_CONFIG: 'scada_collector_config',
  BACKEND_CONFIG: 'scada_backend_config'
};

// ============================================
// Local Backend URL (Node.js server for persistence)
// In production (Docker), use relative URLs for nginx proxy
// In development, use localhost:3002 for the local Node.js server
// ============================================
const getLocalBackendUrl = (): string => {
  // Check if we're in production (served on port 80/443)
  const isDefaultPort = window.location.port === '' || window.location.port === '80' || window.location.port === '443';
  
  // If on default port, we're in production with nginx proxy - use relative URLs
  if (isDefaultPort) {
    return ''; // Use relative URLs for nginx proxy
  }
  
  // Otherwise, we're in development - use local Node.js server
  return 'http://localhost:3002';
};

// ============================================
// Default Configuration - IP: 10.147.18.10
// ============================================
const DEFAULT_COLLECTOR_HOST = '10.147.18.10';
const DEFAULT_API_PORT = 8000;
const DEFAULT_MQTT_PORT = 1883;
const DEFAULT_DB_PORT = 5432;

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
  driver: string;
}

export interface CollectorConfig {
  collector: {
    host: string;
    port: number;
    token: string;
    enabled: boolean;
  };
  mqtt: {
    broker_url: string;
    mqtt_host: string;
    mqtt_port: number;
    topic: string;
    enabled: boolean;
  };
  database: DatabaseConfig & {
    record_save_interval?: number;
  };
}

const DEFAULT_DATABASE_CONFIG: DatabaseConfig = {
  host: 'db', // Docker service name or IP
  port: DEFAULT_DB_PORT,
  user: 'backend',
  password: 'backend_pass',
  name: 'industrial',
  driver: 'postgresql+asyncpg'
};

const DEFAULT_COLLECTOR_CONFIG: CollectorConfig = {
  collector: {
    host: DEFAULT_COLLECTOR_HOST,
    port: DEFAULT_API_PORT,
    token: 'Ya_3n2CUIdhUbvV1hkT8SMb-TH8rGp1N0rxng9y6dqI', // Default token
    enabled: true
  },
  mqtt: {
    broker_url: `mqtt://${DEFAULT_COLLECTOR_HOST}:${DEFAULT_MQTT_PORT}`,
    mqtt_host: DEFAULT_COLLECTOR_HOST,
    mqtt_port: DEFAULT_MQTT_PORT,
    topic: 'machines/#',
    enabled: true
  },
  database: {
    ...DEFAULT_DATABASE_CONFIG,
    record_save_interval: 10
  }
};

class AdminService {
  private baseUrl: string;
  private token: string;
  private collectorConfig: CollectorConfig;

  constructor() {
    // Load persisted configuration or use defaults
    this.collectorConfig = this.loadCollectorConfig();
    
    // Token from collector config takes precedence, then fallback to separate storage
    this.token = this.collectorConfig.collector.token || localStorage.getItem(STORAGE_KEYS.API_TOKEN) || '';
    
    // Build base URL from collector config
    this.baseUrl = this.buildBaseUrlFromConfig();
    
    console.log('AdminService initialized:', {
      baseUrl: this.baseUrl,
      collectorHost: this.collectorConfig.collector.host,
      hasToken: !!this.token
    });
  }

  private loadCollectorConfig(): CollectorConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.COLLECTOR_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all fields exist
        const config: CollectorConfig = {
          collector: { ...DEFAULT_COLLECTOR_CONFIG.collector, ...parsed.collector },
          mqtt: { ...DEFAULT_COLLECTOR_CONFIG.mqtt, ...parsed.mqtt },
          database: { ...DEFAULT_DATABASE_CONFIG, ...parsed.database }
        };
        // If token is empty, use default token
        if (!config.collector.token) {
          config.collector.token = DEFAULT_COLLECTOR_CONFIG.collector.token;
        }
        return config;
      }
    } catch (e) {
      console.warn('Error loading collector config from storage:', e);
    }
    // Save defaults on first load
    this.saveCollectorConfigToStorage(DEFAULT_COLLECTOR_CONFIG);
    return { ...DEFAULT_COLLECTOR_CONFIG };
  }

  private saveCollectorConfigToStorage(config: CollectorConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.COLLECTOR_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving collector config to storage:', e);
    }
  }

  private buildBaseUrlFromConfig(): string {
    const { host, port } = this.collectorConfig.collector;
    
    // In production (served from nginx proxy), always use relative URLs
    // This allows nginx to proxy requests to the actual backend
    const isProduction = import.meta.env.PROD;
    const currentHost = window.location.hostname;
    
    // Use proxy (relative URLs) when:
    // 1. Running in production mode (built app served by nginx)
    // 2. Accessing from localhost (even in dev, nginx might be proxying)
    // 3. Host is configured as localhost
    if (isProduction || currentHost === 'localhost' || currentHost === '127.0.0.1' || 
        host === 'localhost' || host === '127.0.0.1' || host === currentHost) {
      return ''; // Use relative URLs for proxy
    }
    
    // In development with remote backend, use direct URL
    return `http://${host}:${port}`;
  }

  // ============================================
  // URL Management
  // ============================================

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
    localStorage.setItem(STORAGE_KEYS.BACKEND_URL, this.baseUrl);
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem(STORAGE_KEYS.API_TOKEN, token);
  }

  getToken(): string {
    return this.token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private buildUrl(path: string): string {
    // Ensure path starts with /api
    const normalizedPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`;
    
    // When using Vite proxy (empty baseUrl), return path as-is
    if (!this.baseUrl || this.baseUrl === '') {
      return normalizedPath;
    }
    
    // For full URLs (remote host), prepend base URL
    return `${this.baseUrl}${normalizedPath}`;
  }

  // ============================================
  // System Status (GET /api/health, GET /api/version)
  // ============================================

  async checkHealth(): Promise<APIHealthResponse | null> {
    try {
      const response = await fetch(this.buildUrl('/api/health'), { 
        headers: this.getHeaders() 
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return null;
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      const response = await fetch(this.buildUrl('/api/version'), { 
        headers: this.getHeaders() 
      });
      if (!response.ok) return null;
      const data: APIVersionResponse = await response.json();
      return data.version;
    } catch (error) {
      console.error('Failed to get version:', error);
      return null;
    }
  }

  async testDataConnection(url?: string): Promise<{ success: boolean; status?: number; error?: string }> {
    try {
      let targetUrl: string;
      if (url) {
        const cleanUrl = url.replace(/\/$/, '');
        targetUrl = cleanUrl === '/api' ? '/api/health' : `${cleanUrl}/api/health`;
      } else {
        targetUrl = this.buildUrl('/api/health');
      }

      console.log('Testing connection to:', targetUrl);
      const response = await fetch(targetUrl, { headers: this.getHeaders() });
      return { success: response.ok, status: response.status };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // PLCs (GET /api/plcs, PATCH /api/plcs/{plc_id})
  // ============================================

  async getPLCs(): Promise<PLC[]> {
    try {
      const url = this.buildUrl('/api/plcs');
      console.log('Fetching PLCs from:', url);
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) throw new Error(`Failed to fetch PLCs: ${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching PLCs:', error);
      return [];
    }
  }

  async getPLC(plcId: number): Promise<PLC | null> {
    try {
      const response = await fetch(this.buildUrl(`/api/plcs/${plcId}`), { 
        headers: this.getHeaders() 
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Error fetching PLC ${plcId}:`, error);
      return null;
    }
  }

  async updatePLC(plcId: number | string, updates: PLCUpdate): Promise<PLC | null> {
    try {
      const response = await fetch(this.buildUrl(`/api/plcs/${plcId}`), {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update PLC');
      return await response.json();
    } catch (error) {
      console.error(`Error updating PLC ${plcId}:`, error);
      throw error;
    }
  }

  // ============================================
  // Sensors (GET /api/sensors, GET /api/sensors/{id}/history)
  // ============================================

  async getSensors(filters?: { machine_code?: string; plc_code?: string; type?: string }): Promise<Sensor[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.machine_code) params.append('machine_code', filters.machine_code);
      if (filters?.plc_code) params.append('plc_code', filters.plc_code);
      if (filters?.type) params.append('type', filters.type);

      const queryString = params.toString();
      const url = this.buildUrl(`/api/sensors${queryString ? `?${queryString}` : ''}`);
      console.log('Fetching Sensors from:', url);
      
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) throw new Error(`Failed to fetch sensors: ${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching sensors:', error);
      return [];
    }
  }

  async getSensor(sensorId: number): Promise<Sensor | null> {
    try {
      const response = await fetch(this.buildUrl(`/api/sensors/${sensorId}`), { 
        headers: this.getHeaders() 
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Error fetching sensor ${sensorId}:`, error);
      return null;
    }
  }

  async getSensorsWithMQTT(filters?: { machine_code?: string; type?: string }): Promise<SensorWithMQTT[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.machine_code) params.append('machine_code', filters.machine_code);
      if (filters?.type) params.append('type', filters.type);

      const queryString = params.toString();
      const url = this.buildUrl(`/api/sensors/mqtt-topics${queryString ? `?${queryString}` : ''}`);
      
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) throw new Error('Failed to fetch sensors with MQTT topics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching sensors with MQTT:', error);
      return [];
    }
  }

  async getSensorHistory(sensorId: number | string, from: string, to: string): Promise<HistoryDatapoint[]> {
    try {
      const params = new URLSearchParams({ from, to });
      const url = this.buildUrl(`/api/sensors/${sensorId}/history?${params}`);
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) throw new Error('Failed to fetch sensor history');
      return await response.json();
    } catch (error) {
      console.error('Error fetching sensor history:', error);
      return [];
    }
  }

  // ============================================
  // Logs (GET /api/logs)
  // ============================================

  async getLogs(params?: LogsQueryParams): Promise<SystemLog[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.level) queryParams.append('level', params.level);
      if (params?.source) queryParams.append('source', params.source);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.skip) queryParams.append('skip', params.skip.toString());

      const queryString = queryParams.toString();
      const url = this.buildUrl(`/api/logs${queryString ? `?${queryString}` : ''}`);
      
      const response = await fetch(url, { headers: this.getHeaders() });
      if (!response.ok) throw new Error('Failed to fetch logs');
      return await response.json();
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  }

  // ============================================
  // Admin - Machine Configuration
  // (GET/POST /api/admin/machines-config)
  // ============================================

  async getMachinesConfig(): Promise<MachineConfigFile[]> {
    try {
      const response = await fetch(this.buildUrl('/api/admin/machines-config'), { 
        headers: this.getHeaders() 
      });
      if (!response.ok) throw new Error('Failed to fetch machines config');
      return await response.json();
    } catch (error) {
      console.error('Error fetching machines config:', error);
      return [];
    }
  }

  async updateMachinesConfig(update: MachineConfigUpdate): Promise<{ status: string; message: string } | null> {
    try {
      const response = await fetch(this.buildUrl('/api/admin/machines-config'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(update)
      });
      if (!response.ok) throw new Error('Failed to update machines config');
      return await response.json();
    } catch (error) {
      console.error('Error updating machines config:', error);
      return null;
    }
  }

  // ============================================
  // Export Configuration (GET /api/export/configuration)
  // ============================================

  async getExportConfiguration(): Promise<ExportConfiguration | null> {
    try {
      const response = await fetch(this.buildUrl('/api/export/configuration'), { 
        headers: this.getHeaders() 
      });
      if (!response.ok) throw new Error('Failed to fetch export configuration');
      return await response.json();
    } catch (error) {
      console.error('Error fetching export configuration:', error);
      return null;
    }
  }

  // ============================================
  // Backend Connection Management (Frontend-only)
  // ============================================

  async getBackends(): Promise<BackendConnection[]> {
    const { host, port } = this.collectorConfig.collector;
    const wsUrl = this.getWebSocketUrl();
    
    return [{
      id: 'default-industrial',
      name: 'Industrial Backend',
      description: `Collector: ${host}:${port}`,
      httpBaseUrl: this.baseUrl,
      wsUrl: wsUrl,
      mqttUrl: this.collectorConfig.mqtt.broker_url,
      sshHost: host,
      sshPort: 22,
      isDefault: true,
      status: 'online'
    }];
  }

  // ============================================
  // Debug Information
  // ============================================

  async getDebugInfo(): Promise<any> {
    const results: any = {
      baseUrl: this.baseUrl,
      token: this.token ? 'Present (Hidden)' : 'Missing',
      endpoints: {}
    };

    const endpoints = ['/api/health', '/api/version', '/api/plcs', '/api/sensors', '/api/logs'];

    for (const endpoint of endpoints) {
      try {
        const url = this.buildUrl(endpoint);
        const start = Date.now();
        const response = await fetch(url, { headers: this.getHeaders() });
        const duration = Date.now() - start;
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        results.endpoints[endpoint] = {
          url,
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
          data
        };
      } catch (error: any) {
        results.endpoints[endpoint] = {
          error: error.message
        };
      }
    }
    return results;
  }

  // ============================================
  // Collector Configuration (Persistent via backend data.yaml)
  // ============================================

  getCollectorConfig(): CollectorConfig {
    return { ...this.collectorConfig };
  }

  // Load config from backend (async) - call on init
  async loadCollectorConfigFromBackend(): Promise<CollectorConfig> {
    try {
      const response = await fetch(`${getLocalBackendUrl()}/api/data-config`);
      if (response.ok) {
        const config = await response.json();
        this.collectorConfig = {
          collector: { ...DEFAULT_COLLECTOR_CONFIG.collector, ...config.collector },
          mqtt: { ...DEFAULT_COLLECTOR_CONFIG.mqtt, ...config.mqtt },
          database: { ...DEFAULT_DATABASE_CONFIG, ...config.database }
        };
        // Also update localStorage as cache
        this.saveCollectorConfigToStorage(this.collectorConfig);
        // Update token and baseUrl
        this.token = this.collectorConfig.collector.token || '';
        this.baseUrl = this.buildBaseUrlFromConfig();
        console.log('Loaded config from backend:', this.collectorConfig.collector.host);
      }
    } catch (e) {
      console.warn('Could not load config from backend, using cached:', e);
    }
    return this.collectorConfig;
  }

  // Save config to backend (persistent) and localStorage (cache)
  async saveCollectorConfigToBackend(config: CollectorConfig): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Validate config
      if (!config.collector?.host) {
        return { success: false, error: 'Host is required' };
      }

      const response = await fetch(`${getLocalBackendUrl()}/api/data-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error || 'Failed to save configuration' };
      }

      const result = await response.json();
      
      // Update internal state
      this.collectorConfig = {
        collector: { ...DEFAULT_COLLECTOR_CONFIG.collector, ...config.collector },
        mqtt: { ...DEFAULT_COLLECTOR_CONFIG.mqtt, ...config.mqtt },
        database: { ...DEFAULT_DATABASE_CONFIG, ...config.database }
      };
      this.token = this.collectorConfig.collector.token || '';
      this.baseUrl = this.buildBaseUrlFromConfig();
      
      // Also cache in localStorage
      this.saveCollectorConfigToStorage(this.collectorConfig);
      
      console.log('Config saved to backend:', this.collectorConfig.collector.host);
      return { success: true, message: 'Configuration saved successfully' };
    } catch (e: any) {
      console.error('Error saving config to backend:', e);
      return { success: false, error: e.message || 'Network error' };
    }
  }

  saveCollectorConfig(config: CollectorConfig): { success: boolean; message?: string; error?: string } {
    try {
      // Validate config
      if (!config.collector?.host) {
        return { success: false, error: 'Host is required' };
      }

      // Update internal config
      this.collectorConfig = {
        collector: { ...DEFAULT_COLLECTOR_CONFIG.collector, ...config.collector },
        mqtt: { ...DEFAULT_COLLECTOR_CONFIG.mqtt, ...config.mqtt },
        database: { ...DEFAULT_DATABASE_CONFIG, ...config.database }
      };

      // Update token from config
      this.token = this.collectorConfig.collector.token || '';

      // Persist to localStorage
      this.saveCollectorConfigToStorage(this.collectorConfig);

      // Update base URL
      this.baseUrl = this.buildBaseUrlFromConfig();
      localStorage.setItem(STORAGE_KEYS.BACKEND_URL, this.baseUrl);

      console.log('Collector config saved:', {
        host: this.collectorConfig.collector.host,
        baseUrl: this.baseUrl,
        hasToken: !!this.token
      });

      return { success: true, message: 'Configuration saved successfully' };
    } catch (e: any) {
      console.error('Error saving collector config:', e);
      return { success: false, error: e.message || 'Unknown error' };
    }
  }

  // ============================================
  // Connection Testing via Backend
  // ============================================

  async testCollectorConnection(host: string, port: number, token: string): Promise<{ success: boolean; status: string; latency?: number; error?: string }> {
    try {
      const response = await fetch(`${getLocalBackendUrl()}/api/test/collector`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, token })
      });
      return await response.json();
    } catch (e: any) {
      return { success: false, status: 'error', error: e.message };
    }
  }

  async testMqttConnection(mqtt_host: string, mqtt_port: number): Promise<{ success: boolean; status: string; error?: string; machines?: number; sensors?: number; totalMessages?: number }> {
    try {
      const response = await fetch(`${getLocalBackendUrl()}/api/test/mqtt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mqtt_host, mqtt_port })
      });
      return await response.json();
    } catch (e: any) {
      return { success: false, status: 'error', error: e.message };
    }
  }

  async testDatabaseConnection(host: string, port: number, user: string, password: string, name: string): Promise<{ success: boolean; status: string; error?: string; message?: string }> {
    try {
      const response = await fetch(`${getLocalBackendUrl()}/api/test/database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, password, name })
      });
      return await response.json();
    } catch (e: any) {
      return { success: false, status: 'error', error: e.message };
    }
  }

  async getConnectionStatus(): Promise<{ collector: any; mqtt: any; database: any }> {
    try {
      const response = await fetch(`${getLocalBackendUrl()}/api/connection-status`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Could not get connection status:', e);
    }
    return {
      collector: { status: 'unknown' },
      mqtt: { status: 'unknown' },
      database: { status: 'unknown' }
    };
  }

  // ============================================
  // Connected Machines & Sensors (from MQTT)
  // ============================================

  async getConnectedMachines(): Promise<{
    machines: Array<{
      code: string;
      plcCode: string;
      sensors: string[];
      sensorCount: number;
      lastSeen: string;
      messageCount: number;
      isActive: boolean;
    }>;
    summary: {
      totalMachines: number;
      activeMachines: number;
      totalSensors: number;
      totalMessages: number;
      uptime: number;
    };
  }> {
    try {
      const response = await fetch(`${getLocalBackendUrl()}/api/machines/connected`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Could not get connected machines:', e);
    }
    return {
      machines: [],
      summary: { totalMachines: 0, activeMachines: 0, totalSensors: 0, totalMessages: 0, uptime: 0 }
    };
  }

  async getMqttStats(): Promise<{
    connected: boolean;
    broker: string;
    topic: string;
    machines: Array<{
      code: string;
      plcCode: string;
      sensors: string[];
      sensorCount: number;
      lastSeen: string;
      messageCount: number;
    }>;
    stats: {
      machineCount: number;
      sensorCount: number;
      totalMessages: number;
      startTime: string;
      uptime: number;
    };
  }> {
    try {
      const response = await fetch(`${getLocalBackendUrl()}/api/mqtt/stats`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Could not get MQTT stats:', e);
    }
    return {
      connected: false,
      broker: '',
      topic: '',
      machines: [],
      stats: { machineCount: 0, sensorCount: 0, totalMessages: 0, startTime: '', uptime: 0 }
    };
  }

  // ============================================
  // Server Status & System Metrics
  // ============================================

  async getServerStatus(): Promise<{
    server: {
      name: string;
      version: string;
      nodeVersion: string;
      platform: string;
      arch: string;
      hostname: string;
      uptime: number;
      startTime: string;
    };
    system: {
      cpuCount: number;
      cpuUsage: number;
      cpuModel: string;
      totalMemory: number;
      freeMemory: number;
      usedMemory: number;
      memoryUsage: number;
      systemUptime: number;
      loadAverage: number[];
    };
    process: {
      pid: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    mqtt: {
      status: string;
      connected: boolean;
      broker: string;
      topic: string;
      machines: number;
      sensors: number;
      totalMessages: number;
      messagesPerSecond: number;
    };
    database: {
      status: string;
      reachable: boolean;
      host: string;
      port: number;
      name: string;
      user: string;
      error?: string;
    };
    collector: {
      status: string;
      reachable: boolean;
      host: string;
      port: number;
      enabled: boolean;
      latency?: number;
      error?: string;
    };
    connections: {
      websocketClients: number;
    };
  } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${getLocalBackendUrl()}/api/server/status`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Could not get server status:', e);
    }
    return null;
  }

  // Get WebSocket URL for real-time connection
  getWebSocketUrl(): string {
    const { host, port } = this.collectorConfig.collector;
    if (host === 'localhost' || host === '127.0.0.1' || host === window.location.hostname) {
      return `ws://${window.location.hostname}:${port}/ws/realtime`;
    }
    return `ws://${host}:${port}/ws/realtime`;
  }

  // Get MQTT broker URL
  getMqttBrokerUrl(): string {
    return this.collectorConfig.mqtt.broker_url;
  }

  async getDatabaseStats(): Promise<any> {
    // Try to get stats from the API if available
    try {
      // First check if we can reach the backend
      const health = await this.checkHealth();
      if (!health) {
        return { connected: false, error: 'Backend not reachable' };
      }
      
      // Return basic stats - detailed stats come via MQTT system/postgresql topic
      return { 
        connected: true, 
        message: 'Connected to backend. Detailed stats available via MQTT system/postgresql topic',
        collectorHost: this.collectorConfig.collector.host
      };
    } catch (e) {
      return { connected: false, error: (e as Error).message };
    }
  }

  // ============================================
  // Legacy/Deprecated Methods (kept for compatibility)
  // ============================================

  async createBackend(_backend: any): Promise<any> { return _backend; }
  async updateBackend(_backend: any): Promise<void> { }
  async deleteBackend(_id: string): Promise<void> { }
  
  async restartService(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Service restart not implemented - restart via SSH or Docker' };
  }

  async getMqttConfig(): Promise<any> {
    return this.collectorConfig.mqtt;
  }

  async saveMqttConfig(config: any): Promise<any> {
    if (config) {
      this.collectorConfig.mqtt = { ...this.collectorConfig.mqtt, ...config };
      this.saveCollectorConfigToStorage(this.collectorConfig);
    }
    return { success: true };
  }

  async syncInventory(): Promise<{ success: boolean; message?: string; error?: string }> {
    // Try to fetch data from backend to verify connection
    try {
      const plcs = await this.getPLCs();
      const sensors = await this.getSensors();
      return { 
        success: true, 
        message: `Synced ${plcs.length} PLCs and ${sensors.length} sensors from backend` 
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async saveInventory(_plcs: any[], _sensors: any[], _machines?: any[]): Promise<{ success: boolean; message?: string; error?: string }> {
    return { success: false, error: 'Inventory is managed via backend YAML configuration' };
  }

  async getInventoryStats(): Promise<{ machines: number; plcs: number; sensors: number; lastModified: string }> {
    try {
      const [plcs, sensors] = await Promise.all([
        this.getPLCs(),
        this.getSensors()
      ]);
      return {
        machines: new Set(plcs.map(p => p.machine_id)).size,
        plcs: plcs.length,
        sensors: sensors.length,
        lastModified: new Date().toISOString()
      };
    } catch {
      return { machines: 0, plcs: 0, sensors: 0, lastModified: '' };
    }
  }

  async updateSensor(_id: number | string, _updates: any): Promise<any> {
    throw new Error('Sensor configuration is managed via backend YAML files');
  }
}

export const adminService = new AdminService();
