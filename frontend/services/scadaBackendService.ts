/**
 * SCADA Backend Service - Unified Integration Layer
 *
 * Centralizes all communication with the real backend in /backend.
 * Provides a clean abstraction for the frontend to consume real sensor and alarm data.
 *
 * Backend: FastAPI + PostgreSQL + MQTT (located at /backend)
 * API Docs: http://localhost:8000/docs
 */

import {
  Machine,
  Sensor,
  SensorWithMQTT,
  PLC,
  HistoryDatapoint,
  DashboardMetric,
  ScadaEvent,
} from '../types';

// Base URL can be configured via environment variable or fallback to relative URL
const getBackendUrl = (): string => {
  // Try environment variable first (e.g., VITE_BACKEND_URL in production)
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  
  // Try window location if running in same-host setup
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000';
  }
  
  // Fallback to relative root path (assumes reverse proxy or same-origin with /api proxy)
  return '';
};

class ScadaBackendService {
  private apiUrl: string;
  private apiToken: string | null = null;
  private tokenInitialized: boolean = false;

  constructor() {
    this.apiUrl = getBackendUrl();
    // Try to load API token from environment or localStorage first
    this.apiToken = import.meta.env.VITE_API_TOKEN || localStorage.getItem('api_token');
    
    if (this.apiToken) {
      this.tokenInitialized = true;
    } else {
      // If no token found, try to fetch it from the backend immediately
      this.initializeToken();
    }
  }

  /**
   * Initialize API token by fetching from backend
   */
  private async initializeToken(): Promise<void> {
    if (this.tokenInitialized) return; // Don't fetch twice
    
    try {
      const response = await fetch(`${this.apiUrl}/api/token`);
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          this.apiToken = data.token;
          localStorage.setItem('api_token', data.token);
          this.tokenInitialized = true;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch API token from backend:', error);
    }
  }

  /**
   * Set the API base URL (useful for dynamic backend switching)
   */
  setApiUrl(url: string): void {
    this.apiUrl = url.replace(/\/$/, '');
  }

  /**
   * Set the API authentication token
   */
  setApiToken(token: string): void {
    this.apiToken = token;
    localStorage.setItem('api_token', token);
  }

  /**
   * Build Authorization header if token is available
   */
  /**
   * Ensure token is initialized before making requests
   */
  async ensureTokenReady(): Promise<void> {
    if (!this.tokenInitialized && !this.apiToken) {
      await this.initializeToken();
      // Wait a bit more if still not initialized
      if (!this.tokenInitialized) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }

    return headers;
  }

  /**
   * Make a GET request to the backend
   */
  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Ensure token is ready before making request
    await this.ensureTokenReady();
    
    const url = `${this.apiUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Clear token if unauthorized
        this.apiToken = null;
        localStorage.removeItem('api_token');
        this.tokenInitialized = false;
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // =====================================================
  // Health & System Endpoints
  // =====================================================

  /**
   * GET /api/health - Check if backend is running
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/health`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * GET /api/version - Get backend version
   */
  async getVersion(): Promise<string | null> {
    try {
      const data = await this.fetch<{ version: string }>('/api/version');
      return data.version;
    } catch (error) {
      console.error('Failed to get version:', error);
      return null;
    }
  }

  // =====================================================
  // Machines Endpoints
  // =====================================================

  /**
   * GET /api/machines - List all machines
   */
  async getMachines(): Promise<Machine[]> {
    try {
      const data = await this.fetch<Machine[]>('/api/machines');
      return data;
    } catch (error) {
      console.error('Failed to fetch machines:', error);
      return [];
    }
  }

  /**
   * GET /api/machines/{machine_id} - Get a specific machine
   */
  async getMachine(machineId: number): Promise<Machine | null> {
    try {
      const data = await this.fetch<Machine>(`/api/machines/${machineId}`);
      return data;
    } catch (error) {
      console.error(`Failed to fetch machine ${machineId}:`, error);
      return null;
    }
  }

  // =====================================================
  // PLCs Endpoints
  // =====================================================

  /**
   * GET /api/plcs - List all PLCs
   */
  async getPLCs(): Promise<PLC[]> {
    try {
      const data = await this.fetch<PLC[]>('/api/plcs');
      return data;
    } catch (error) {
      console.error('Failed to fetch PLCs:', error);
      return [];
    }
  }

  /**
   * GET /api/plcs/{plc_id} - Get a specific PLC
   */
  async getPLC(plcId: number): Promise<PLC | null> {
    try {
      const data = await this.fetch<PLC>(`/api/plcs/${plcId}`);
      return data;
    } catch (error) {
      console.error(`Failed to fetch PLC ${plcId}:`, error);
      return null;
    }
  }

  /**
   * PATCH /api/plcs/{plc_id} - Update PLC configuration
   */
  async updatePLC(plcId: number, updates: Partial<PLC>): Promise<PLC | null> {
    try {
      const data = await this.fetch<PLC>(`/api/plcs/${plcId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      return data;
    } catch (error) {
      console.error(`Failed to update PLC ${plcId}:`, error);
      return null;
    }
  }

  // =====================================================
  // Sensors Endpoints
  // =====================================================

  /**
   * GET /api/sensors - List all sensors with optional filters
   */
  async getSensors(filters?: {
    machineCode?: string;
    plcCode?: string;
    type?: string;
  }): Promise<Sensor[]> {
    try {
      let endpoint = '/api/sensors';
      if (filters) {
        const params = new URLSearchParams();
        if (filters.machineCode) params.append('machine_code', filters.machineCode);
        if (filters.plcCode) params.append('plc_code', filters.plcCode);
        if (filters.type) params.append('type', filters.type);

        const queryString = params.toString();
        if (queryString) {
          endpoint += `?${queryString}`;
        }
      }

      const data = await this.fetch<Sensor[]>(endpoint);
      return data;
    } catch (error) {
      console.error('Failed to fetch sensors:', error);
      return [];
    }
  }

  /**
   * GET /api/sensors/mqtt-topics - List sensors with MQTT topics
   * Perfect for frontend dashboard integration
   */
  async getSensorsWithMQTTTopics(filters?: {
    machineCode?: string;
    type?: string;
  }): Promise<SensorWithMQTT[]> {
    try {
      let endpoint = '/api/sensors/mqtt-topics';
      if (filters) {
        const params = new URLSearchParams();
        if (filters.machineCode) params.append('machine_code', filters.machineCode);
        if (filters.type) params.append('type', filters.type);

        const queryString = params.toString();
        if (queryString) {
          endpoint += `?${queryString}`;
        }
      }

      const data = await this.fetch<SensorWithMQTT[]>(endpoint);
      return data;
    } catch (error) {
      console.error('Failed to fetch sensors with MQTT topics:', error);
      return [];
    }
  }

  /**
   * GET /api/sensors/{sensor_id} - Get a specific sensor
   */
  async getSensor(sensorId: number): Promise<Sensor | null> {
    try {
      const data = await this.fetch<Sensor>(`/api/sensors/${sensorId}`);
      return data;
    } catch (error) {
      console.error(`Failed to fetch sensor ${sensorId}:`, error);
      return null;
    }
  }

  /**
   * GET /api/sensors/{sensor_id}/history - Get sensor historical data
   */
  async getSensorHistory(
    sensorId: number,
    from: Date,
    to: Date
  ): Promise<HistoryDatapoint[]> {
    try {
      // Format dates as ISO 8601 strings
      const fromStr = from.toISOString();
      const toStr = to.toISOString();

      const endpoint = `/api/sensors/${sensorId}/history?from=${encodeURIComponent(
        fromStr
      )}&to=${encodeURIComponent(toStr)}`;

      const data = await this.fetch<HistoryDatapoint[]>(endpoint);
      return data;
    } catch (error) {
      console.error(`Failed to fetch sensor history for ${sensorId}:`, error);
      return [];
    }
  }

  // =====================================================
  // Real-time Data Endpoints (via MQTT or WebSocket)
  // =====================================================

  /**
   * Get current sensor values (latest readings from MQTT or database)
   * This is a convenience method that fetches the latest values
   */
  async getSensorValues(machineCode?: string): Promise<{
    sensors: Record<string, { value: number; timestamp: string; status: string }>;
  }> {
    try {
      // Get all sensors with MQTT topics which includes latest values in metadata
      const sensorsWithTopics = await this.getSensorsWithMQTTTopics({
        machineCode,
      });

      const sensorValues: Record<
        string,
        { value: number; timestamp: string; status: string }
      > = {};

      for (const sensor of sensorsWithTopics) {
        // In a real scenario, we'd fetch the latest value from a cache or metrics endpoint
        // For now, we'll return 0 as a placeholder
        sensorValues[sensor.code] = {
          value: 0,
          timestamp: new Date().toISOString(),
          status: 'unknown',
        };
      }

      return { sensors: sensorValues };
    } catch (error) {
      console.error('Failed to fetch sensor values:', error);
      return { sensors: {} };
    }
  }

  /**
   * Connect to WebSocket for real-time sensor data
   * Path: /ws/realtime
   */
  connectWebSocket(
    onMessage: (data: any) => void,
    onError: (error: Event) => void,
    onClose: () => void
  ): WebSocket | null {
    try {
      const protocol = this.apiUrl.startsWith('https') ? 'wss' : 'ws';
      const wsUrl = this.apiUrl
        .replace(/^https?:\/\//, '')
        .replace(/^http:\/\//, '');
      const ws = new WebSocket(`${protocol}://${wsUrl}/ws/realtime`);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = onError;
      ws.onclose = onClose;

      return ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      return null;
    }
  }

  /**
   * Subscribe to WebSocket real-time data for specific sensors
   */
  subscribeToSensorData(ws: WebSocket, sensorCodes: string[]): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          action: 'subscribe',
          sensors: sensorCodes,
        })
      );
    }
  }

  // =====================================================
  // Alarms Endpoints
  // =====================================================

  /**
   * GET /api/alarms - List all alarms with optional filters
   */
  async getAlarms(filters?: {
    machineCode?: string;
    severity?: string;
    status?: number;
    limit?: number;
    skip?: number;
  }): Promise<any[]> {
    try {
      let endpoint = '/api/alarms';
      if (filters) {
        const params = new URLSearchParams();
        if (filters.machineCode) params.append('machine_code', filters.machineCode);
        if (filters.severity) params.append('severity', filters.severity);
        if (filters.status !== undefined) params.append('status', filters.status.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.skip) params.append('skip', filters.skip.toString());

        const queryString = params.toString();
        if (queryString) {
          endpoint += `?${queryString}`;
        }
      }

      const data = await this.fetch<any[]>(endpoint);
      return data;
    } catch (error) {
      console.error('Failed to fetch alarms:', error);
      return [];
    }
  }

  /**
   * GET /api/alarms/active - Get only active alarms
   * Most important endpoint for dashboard alerts
   */
  async getActiveAlarms(filters?: {
    machineCode?: string;
    severity?: string;
  }): Promise<any[]> {
    try {
      let endpoint = '/api/alarms/active';
      if (filters) {
        const params = new URLSearchParams();
        if (filters.machineCode) params.append('machine_code', filters.machineCode);
        if (filters.severity) params.append('severity', filters.severity);

        const queryString = params.toString();
        if (queryString) {
          endpoint += `?${queryString}`;
        }
      }

      const data = await this.fetch<any[]>(endpoint);
      return data;
    } catch (error) {
      console.error('Failed to fetch active alarms:', error);
      return [];
    }
  }

  /**
   * GET /api/machines/{machine_id}/alarms - Get alarms for a specific machine
   */
  async getMachineAlarms(
    machineId: number,
    filters?: {
      status?: number;
      limit?: number;
      skip?: number;
    }
  ): Promise<any[]> {
    try {
      let endpoint = `/api/machines/${machineId}/alarms`;
      if (filters) {
        const params = new URLSearchParams();
        if (filters.status !== undefined) params.append('status', filters.status.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.skip) params.append('skip', filters.skip.toString());

        const queryString = params.toString();
        if (queryString) {
          endpoint += `?${queryString}`;
        }
      }

      const data = await this.fetch<any[]>(endpoint);
      return data;
    } catch (error) {
      console.error(`Failed to fetch alarms for machine ${machineId}:`, error);
      return [];
    }
  }

  /**
   * GET /api/machines/{machine_id}/alarm-sensors - Get available alarm sensors for a machine
   */
  async getMachineAlarmSensors(machineId: number): Promise<any | null> {
    try {
      const data = await this.fetch<any>(`/api/machines/${machineId}/alarm-sensors`);
      return data;
    } catch (error) {
      console.error(`Failed to fetch alarm sensors for machine ${machineId}:`, error);
      return null;
    }
  }

  /**
   * POST /api/alarms - Create a new alarm (if backend supports it)
   */
  async createAlarm(alarmData: any): Promise<any | null> {
    try {
      const data = await this.fetch<any>('/api/alarms', {
        method: 'POST',
        body: JSON.stringify(alarmData),
      });
      return data;
    } catch (error) {
      console.error('Failed to create alarm:', error);
      return null;
    }
  }

  // =====================================================
  // System Logs & Events
  // =====================================================

  /**
   * GET /api/logs - Get system logs
   */
  async getLogs(filters?: {
    level?: string;
    source?: string;
    limit?: number;
    skip?: number;
  }): Promise<any[]> {
    try {
      let endpoint = '/api/logs';
      if (filters) {
        const params = new URLSearchParams();
        if (filters.level) params.append('level', filters.level);
        if (filters.source) params.append('source', filters.source);
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.skip) params.append('skip', filters.skip.toString());

        const queryString = params.toString();
        if (queryString) {
          endpoint += `?${queryString}`;
        }
      }

      const data = await this.fetch<any[]>(endpoint);
      return data;
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      return [];
    }
  }

  // =====================================================
  // Sensor Logs Endpoints
  // =====================================================

  /**
   * GET /api/sensors/logs - Get sensor logs with filtering and pagination
   */
  async getSensorLogs(filters?: {
    sensor_id?: number;
    machine_id?: number;
    severity?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    skip?: number;
  }): Promise<any[]> {
    try {
      let endpoint = '/api/sensors/logs';
      if (filters) {
        const params = new URLSearchParams();
        if (filters.sensor_id) params.append('sensor_id', filters.sensor_id.toString());
        if (filters.machine_id) params.append('machine_id', filters.machine_id.toString());
        if (filters.severity) params.append('severity', filters.severity);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.skip) params.append('skip', filters.skip.toString());

        const queryString = params.toString();
        if (queryString) {
          endpoint += `?${queryString}`;
        }
      }

      const data = await this.fetch<any[]>(endpoint);
      return data;
    } catch (error) {
      console.error('Failed to fetch sensor logs:', error);
      return [];
    }
  }

  /**
   * POST /api/sensors/logs - Create a new sensor log
   */
  async createSensorLog(logData: any): Promise<any | null> {
    try {
      const data = await this.fetch<any>('/api/sensors/logs', {
        method: 'POST',
        body: JSON.stringify(logData),
      });
      return data;
    } catch (error) {
      console.error('Failed to create sensor log:', error);
      return null;
    }
  }

  /**
   * GET /api/sensors/{sensor_id}/severity-config - Get sensor severity configuration
   */
  async getSensorSeverityConfig(sensorId: number): Promise<any | null> {
    try {
      const data = await this.fetch<any>(`/api/sensors/${sensorId}/severity-config`);
      return data;
    } catch (error) {
      console.error(`Failed to fetch severity config for sensor ${sensorId}:`, error);
      return null;
    }
  }

  /**
   * POST /api/sensors/{sensor_id}/severity-config - Update sensor severity configuration
   */
  async updateSensorSeverityConfig(sensorId: number, config: any): Promise<any | null> {
    try {
      const data = await this.fetch<any>(`/api/sensors/${sensorId}/severity-config`, {
        method: 'POST',
        body: JSON.stringify(config),
      });
      return data;
    } catch (error) {
      console.error(`Failed to update severity config for sensor ${sensorId}:`, error);
      return null;
    }
  }

  /**
   * GET /api/sensors/logs/critical/count - Get count of critical alarms
   */
  async getCriticalAlarmsCount(): Promise<{ count: number; severity: string } | null> {
    try {
      const data = await this.fetch<{ count: number; severity: string }>('/api/sensors/logs/critical/count');
      return data;
    } catch (error) {
      console.error('Failed to fetch critical alarms count:', error);
      return null;
    }
  }

  // =====================================================
  // Configuration Export/Import
  // =====================================================

  /**
   * GET /api/export/configuration - Export full system configuration
   */
  async exportConfiguration(): Promise<any | null> {
    try {
      const data = await this.fetch<any>('/api/export/configuration');
      return data;
    } catch (error) {
      console.error('Failed to export configuration:', error);
      return null;
    }
  }
}

// Export singleton instance
export const scadaBackendService = new ScadaBackendService();
