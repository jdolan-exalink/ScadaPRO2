/**
 * IoT Service - Industrial IoT Backend API Client
 * 
 * Provides access to machines, sensors, and historical data.
 * API Documentation: http://localhost:8000/docs
 */

import { 
  Machine, 
  MachineLayout, 
  Sensor, 
  SensorWithMQTT,
  HistoryDatapoint, 
  ScadaEvent, 
  DashboardMetric,
  PLC,
  ExportConfiguration
} from '../types';
import { historyService } from './historyService';

// Default API base URL (proxied through Vite in development)
const DEFAULT_API_URL = '/api';

class IoTService {
  private apiUrl = DEFAULT_API_URL;

  /**
   * Set the API base URL
   */
  setApiUrl(url: string): void {
    this.apiUrl = url.replace(/\/$/, '');
  }

  /**
   * GET /api/health - Check if the service is running
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
      const response = await fetch(`${this.apiUrl}/version`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.version;
    } catch (error) {
      console.error('Failed to get version:', error);
      return null;
    }
  }

  /**
   * GET /api/machines/connected - List connected machines with sensor info
   */
  async getConnectedMachines(): Promise<Machine[]> {
    try {
      const response = await fetch(`${this.apiUrl}/machines/connected`);
      if (!response.ok) throw new Error('Failed to fetch connected machines');

      const data = await response.json();
      const connectedMachines = data.machines || [];

      // Convert to Machine interface format
      return connectedMachines.map((cm: any) => ({
        id: Date.now() + Math.random(), // Generate temporary ID since API doesn't provide it
        code: cm.code,
        name: cm.code.toUpperCase().replace('_', ' '), // Generate name from code
        description: `Connected machine with ${cm.sensorCount} sensors`,
        status: cm.isActive ? 'running' : 'stopped',
        uptime: undefined,
        lastUpdate: cm.lastSeen,
        created_at: new Date().toISOString(),
        updated_at: cm.lastSeen
      }));
    } catch (error) {
      console.error('Error fetching connected machines:', error);
      return [];
    }
  }

  /**
   * GET /api/machines - List all configured machines
   */
  async getMachines(): Promise<Machine[]> {
    try {
      const response = await fetch(`${this.apiUrl}/machines`);
      if (!response.ok) throw new Error('Failed to fetch machines');

      const machines: Machine[] = await response.json();

      // Add frontend-only computed fields
      return machines.map((m) => ({
        ...m,
        status: 'running' as const, // Default status (could be computed from sensor data)
        uptime: undefined,
        lastUpdate: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error fetching machines:', error);
      return [];
    }
  }

  /**
   * GET /api/machines/{machine_id} - Get machine details
   */
  async getMachine(machineId: number): Promise<Machine | null> {
    try {
      const response = await fetch(`${this.apiUrl}/machines/${machineId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Error fetching machine ${machineId}:`, error);
      return null;
    }
  }

  /**
   * GET /api/plcs - List all PLCs
   */
  async getPLCs(): Promise<PLC[]> {
    try {
      const response = await fetch(`${this.apiUrl}/plcs`);
      if (!response.ok) throw new Error('Failed to fetch PLCs');
      return await response.json();
    } catch (error) {
      console.error('Error fetching PLCs:', error);
      return [];
    }
  }

  /**
   * GET /api/plcs/{plc_id} - Get PLC details
   */
  async getPLC(plcId: number): Promise<PLC | null> {
    try {
      const response = await fetch(`${this.apiUrl}/plcs/${plcId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Error fetching PLC ${plcId}:`, error);
      return null;
    }
  }

  /**
   * PATCH /api/plcs/{plc_id} - Update PLC configuration
   */
  async updatePLC(plcId: number, updates: { enabled?: boolean; poll_interval_s?: number }): Promise<PLC | null> {
    try {
      const response = await fetch(`${this.apiUrl}/plcs/${plcId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update PLC');
      return await response.json();
    } catch (error) {
      console.error(`Error updating PLC ${plcId}:`, error);
      return null;
    }
  }

  /**
   * GET /api/sensors - List sensors with optional filters
   */
  async getSensors(filters?: { machine_code?: string; plc_code?: string; type?: string }): Promise<Sensor[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.machine_code) params.append('machine_code', filters.machine_code);
      if (filters?.plc_code) params.append('plc_code', filters.plc_code);
      if (filters?.type) params.append('type', filters.type);

      const queryString = params.toString();
      const url = `${this.apiUrl}/sensors${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch sensors');
      return await response.json();
    } catch (error) {
      console.error('Error fetching sensors:', error);
      return [];
    }
  }

  /**
   * GET /api/sensors/{sensor_id} - Get sensor details
   */
  async getSensor(sensorId: number): Promise<Sensor | null> {
    try {
      const response = await fetch(`${this.apiUrl}/sensors/${sensorId}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`Error fetching sensor ${sensorId}:`, error);
      return null;
    }
  }

  /**
   * GET /api/sensors/mqtt-topics - Get sensors with MQTT topic information
   * Useful for frontend integration with real-time data
   */
  async getSensorsWithMQTT(filters?: { machine_code?: string; type?: string }): Promise<SensorWithMQTT[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.machine_code) params.append('machine_code', filters.machine_code);
      if (filters?.type) params.append('type', filters.type);

      const queryString = params.toString();
      const url = `${this.apiUrl}/sensors/mqtt-topics${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch sensors with MQTT topics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching sensors with MQTT:', error);
      return [];
    }
  }

  /**
   * GET /api/sensors/{sensor_id}/history - Get historical data for a sensor
   */
  async getSensorHistory(sensorId: number, from: Date, to: Date): Promise<HistoryDatapoint[]> {
    try {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString()
      });
      
      const response = await fetch(`${this.apiUrl}/sensors/${sensorId}/history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch sensor history');
      return await response.json();
    } catch (error) {
      console.error(`Error fetching history for sensor ${sensorId}:`, error);
      return [];
    }
  }

  /**
   * Get sensor history by sensor code (convenience method)
   * First finds the sensor by code, then fetches history
   * Falls back to local history if API is unavailable
   */
  async getSensorHistoryByCode(sensorCode: string, from: Date, to: Date): Promise<HistoryDatapoint[]> {
    try {
      // Extract machine code from sensor code (e.g., "sec21_temp_01" -> "sec21")
      const machineCode = sensorCode.split('_')[0];

      const sensors = await this.getSensors({ machine_code: machineCode });
      const sensor = sensors.find((s) => s.code === sensorCode);

      if (!sensor) {
        console.warn(`Sensor ${sensorCode} not found`);
        // Try local history as fallback
        return await this.getLocalSensorHistory(sensorCode, from, to);
      }

      // Try API first
      try {
        const history = await this.getSensorHistory(sensor.id, from, to);
        return history;
      } catch (apiError) {
        console.warn('API history failed, using local history:', apiError);
        return await this.getLocalSensorHistory(sensorCode, from, to);
      }
    } catch (error) {
      console.error(`Error fetching history for sensor code ${sensorCode}:`, error);
      // Final fallback to local history
      return await this.getLocalSensorHistory(sensorCode, from, to);
    }
  }

  /**
   * Get local sensor history from SQLite database
   */
  private async getLocalSensorHistory(sensorCode: string, from: Date, to: Date): Promise<HistoryDatapoint[]> {
    try {
      const hours = (to.getTime() - from.getTime()) / (1000 * 60 * 60);
      const localHistory = await historyService.getSensorHistory(sensorCode, hours);

      return localHistory
        .filter(point => {
          const pointTime = new Date(point.timestamp).getTime();
          return pointTime >= from.getTime() && pointTime <= to.getTime();
        })
        .map(point => ({
          timestamp: point.timestamp,
          value: point.value,
          unit: point.unit
        }));
    } catch (error) {
      console.error('Error getting local history:', error);
      return [];
    }
  }

  /**
   * GET /api/export/configuration - Get complete asset and sensor configuration
   */
  async getExportConfiguration(): Promise<ExportConfiguration | null> {
    try {
      const response = await fetch(`${this.apiUrl}/export/configuration`);
      if (!response.ok) throw new Error('Failed to fetch export configuration');
      return await response.json();
    } catch (error) {
      console.error('Error fetching export configuration:', error);
      return null;
    }
  }

  // ============================================
  // Dashboard Metrics (Frontend-specific, uses local storage or backend)
  // ============================================

  async getDashboardMetrics(): Promise<DashboardMetric[]> {
    try {
      const response = await fetch(`${this.apiUrl}/dashboard/metrics`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return await response.json();
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return [];
    }
  }

  async addDashboardMetric(metric: DashboardMetric): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/dashboard/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric)
      });
    } catch (error) {
      console.error('Error adding metric:', error);
    }
  }

  async updateDashboardMetric(metricId: string, updates: Partial<DashboardMetric>): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/dashboard/metrics/${metricId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Error updating metric:', error);
    }
  }

  async deleteDashboardMetric(metricId: string): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/dashboard/metrics/${metricId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting metric:', error);
    }
  }

  // ============================================
  // Machine Layout (Frontend-specific)
  // ============================================

  async getMachineLayout(machineId: string): Promise<MachineLayout> {
    try {
      const response = await fetch(`${this.apiUrl}/layouts/${machineId}`);
      if (!response.ok) throw new Error('Failed to fetch layout');
      return await response.json();
    } catch (error) {
      console.error('Error fetching layout:', error);
      return { machineId, widgets: [] };
    }
  }

  // ============================================
  // Sensor Values & History
  // ============================================

  /**
   * GET /api/sensors/values - Get current sensor values and store in local history
   */
  async getSensorValues(): Promise<{ sensors: Record<string, { value: number; unit: string; timestamp: string }> }> {
    try {
      const response = await fetch(`${this.apiUrl}/sensors/values`);
      if (!response.ok) throw new Error('Failed to fetch sensor values');

      const data = await response.json();

      // Store values in local history for offline access
      if (data.sensors) {
        for (const [sensorCode, sensorData] of Object.entries(data.sensors)) {
          const sensor = sensorData as { value: number; unit: string; timestamp: string };
          try {
            await historyService.storeSensorValue(sensorCode, sensor.value, sensor.unit);
          } catch (error) {
            console.error(`Error storing history for ${sensorCode}:`, error);
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Error fetching sensor values:', error);
      // Try to return cached values from local history
      return this.getCachedSensorValues();
    }
  }

  /**
   * Get cached sensor values from local history when API is unavailable
   */
  private async getCachedSensorValues(): Promise<{ sensors: Record<string, { value: number; unit: string; timestamp: string }> }> {
    try {
      const availableSensors = await historyService.getAvailableSensors();
      const sensors: Record<string, { value: number; unit: string; timestamp: string }> = {};

      for (const sensorCode of availableSensors) {
        const latestValue = await historyService.getLatestSensorValue(sensorCode);
        if (latestValue) {
          sensors[sensorCode] = {
            value: latestValue.value,
            unit: latestValue.unit,
            timestamp: latestValue.timestamp
          };
        }
      }

      return { sensors };
    } catch (error) {
      console.error('Error getting cached values:', error);
      return { sensors: {} };
    }
  }

}

export const iotService = new IoTService();
