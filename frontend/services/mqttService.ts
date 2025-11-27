/**
 * MQTT/WebSocket Service - Real-time data connection
 * 
 * Connects to the backend WebSocket endpoint for real-time sensor updates.
 * WebSocket URL: ws://<host>:8000/ws/realtime
 * 
 * Protocol:
 * 1. Connect to WebSocket
 * 2. Subscribe to sensors: { action: "subscribe", sensors: ["sensor_code_1", "sensor_code_2"] }
 * 3. Receive measurements: { type: "measurement", sensor_code: "...", timestamp: "...", value: ..., unit: "..." }
 */

import { WSSubscribeMessage, WSMeasurement, MQTTSensorPayload, MQTTSystemStatus, PostgreSQLStats } from '../types';

// Callback types for different message types
export type SensorUpdateCallback = (payload: MQTTSensorPayload, topic?: string) => void;
export type SystemStatusCallback = (status: MQTTSystemStatus) => void;
export type PostgreSQLStatusCallback = (stats: PostgreSQLStats) => void;
export type MeasurementCallback = (measurement: WSMeasurement) => void;
export type ConnectionStatusCallback = (connected: boolean) => void;

// Legacy export for compatibility
export interface SensorUpdate {
  sensor_code: string;
  value: number;
  timestamp: string;
  unit?: string;
}

export class MQTTService {
  private ws: WebSocket | null = null;
  private callbacks: Map<string, SensorUpdateCallback> = new Map();
  private measurementCallbacks: Map<string, MeasurementCallback> = new Map();
  private systemStatusCallback: SystemStatusCallback | null = null;
  private postgresqlStatusCallback: PostgreSQLStatusCallback | null = null;
  private connectionStatusCallbacks: ConnectionStatusCallback[] = [];
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private wsUrl: string = '';
  private wsToken: string = '';
  private subscribedSensors: string[] = [];

  constructor() {}

  /**
   * Connect to the WebSocket real-time endpoint
   * @param wsUrl - WebSocket URL (e.g., ws://localhost:8000/ws/realtime)
   * @param token - Optional authentication token
   */
  async connect(wsUrl: string, token?: string): Promise<boolean> {
    this.wsUrl = wsUrl;
    this.wsToken = token || '';
    
    try {
      // Append token to URL if provided (WebSocket doesn't support headers easily)
      let finalUrl = wsUrl;
      if (this.wsToken) {
        const separator = wsUrl.includes('?') ? '&' : '?';
        finalUrl = `${wsUrl}${separator}token=${this.wsToken}`;
      }
      
      console.log(`🔌 Connecting to WebSocket: ${wsUrl} (token: ${this.wsToken ? 'yes' : 'no'})`);

      return new Promise((resolve, reject) => {
        this.ws = new WebSocket(finalUrl);

        const connectionTimeout = setTimeout(() => {
          console.error('⏱️ WebSocket connection timeout after 10 seconds');
          if (this.ws) {
            this.ws.close();
          }
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('✅ Connected to WebSocket!');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Notify connection status listeners
          this.connectionStatusCallbacks.forEach(cb => cb(true));
          
          // Re-subscribe to sensors if we had previous subscriptions
          if (this.subscribedSensors.length > 0) {
            this.subscribeToSensors(this.subscribedSensors);
          }
          
          resolve(true);
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('❌ WebSocket connection error:', error);
          this.isConnected = false;
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log(`🔌 WebSocket connection closed (code: ${event.code})`);
          this.isConnected = false;
          // Notify connection status listeners
          this.connectionStatusCallbacks.forEach(cb => cb(false));
          this.attemptReconnect();
        };
      });
    } catch (error) {
      console.error('💥 Failed to connect to WebSocket:', error);
      throw error;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle connection confirmation
      if (message.type === 'connected') {
        console.log('📡 WebSocket connection confirmed:', message.message);
        return;
      }

      // Handle measurement from WebSocket real-time endpoint
      if (message.type === 'measurement') {
        const measurement: WSMeasurement = message;
        
        // Notify measurement-specific callbacks
        const measurementCallback = this.measurementCallbacks.get(measurement.sensor_code);
        if (measurementCallback) {
          measurementCallback(measurement);
        }

        // Also convert to MQTTSensorPayload format for legacy callbacks
        const payload: MQTTSensorPayload = {
          sensor_code: measurement.sensor_code,
          timestamp: measurement.timestamp,
          value: measurement.value,
          unit: measurement.unit
        };

        // Notify all registered topic callbacks
        this.callbacks.forEach((callback, topic) => {
          if (topic === '*' || topic.includes(measurement.sensor_code)) {
            callback(payload);
          }
        });
        return;
      }

      // Handle MQTT proxy message format: { topic, payload }
      if (message.topic && message.payload !== undefined) {
        const topic = message.topic as string;
        const payload = message.payload;

        // Check for system status topics
        if (topic.startsWith('system/')) {
          if (topic === 'system/status' && this.systemStatusCallback) {
            this.systemStatusCallback(payload as MQTTSystemStatus);
          }
          if (topic === 'system/postgresql' && this.postgresqlStatusCallback) {
            this.postgresqlStatusCallback(payload as PostgreSQLStats);
          }
          return;
        }

        // Sensor data from machines/{machine}/{plc}/{sensor}
        this.callbacks.forEach((callback, registeredTopic) => {
          if (registeredTopic === '*' || topic.includes(registeredTopic) || registeredTopic.includes('*')) {
            callback(payload, topic);
          }
        });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, data);
    }
  }

  /**
   * Subscribe to specific sensors for real-time updates
   * Sends: { action: "subscribe", sensors: ["sensor_code_1", ...] }
   */
  subscribeToSensors(sensorCodes: string[]): void {
    if (!this.ws || !this.isConnected) {
      console.warn('Cannot subscribe: WebSocket not connected');
      // Store for later when connected
      this.subscribedSensors = [...new Set([...this.subscribedSensors, ...sensorCodes])];
      return;
    }

    const subscribeMessage: WSSubscribeMessage = {
      action: 'subscribe',
      sensors: sensorCodes
    };

    console.log(`📡 Subscribing to sensors:`, sensorCodes);
    this.ws.send(JSON.stringify(subscribeMessage));
    
    // Track subscribed sensors for reconnection
    this.subscribedSensors = [...new Set([...this.subscribedSensors, ...sensorCodes])];
  }

  /**
   * Register a callback for a specific topic pattern or sensor
   * @param topic - Topic pattern or '*' for all messages
   * @param callback - Function to call when data is received
   */
  subscribe(topic: string, callback: SensorUpdateCallback): void {
    console.log(`📡 Registering callback for topic: ${topic}`);
    this.callbacks.set(topic, callback);
  }

  /**
   * Register a callback for a specific sensor's measurements
   */
  onSensorMeasurement(sensorCode: string, callback: MeasurementCallback): void {
    console.log(`📡 Registering measurement callback for sensor: ${sensorCode}`);
    this.measurementCallbacks.set(sensorCode, callback);
  }

  /**
   * Register callback for system status updates (system/status topic)
   */
  onSystemStatus(callback: SystemStatusCallback): void {
    this.systemStatusCallback = callback;
  }

  /**
   * Register callback for PostgreSQL status updates (system/postgresql topic)
   */
  onPostgreSQLStatus(callback: PostgreSQLStatusCallback): void {
    this.postgresqlStatusCallback = callback;
  }

  /**
   * Register callback for connection status changes
   */
  onConnectionChange(callback: ConnectionStatusCallback): void {
    this.connectionStatusCallbacks.push(callback);
    // Immediately notify of current status
    callback(this.isConnected);
  }

  /**
   * Remove connection status callback
   */
  offConnectionChange(callback: ConnectionStatusCallback): void {
    this.connectionStatusCallbacks = this.connectionStatusCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string): void {
    console.log(`🔕 Unregistering callback for topic: ${topic}`);
    this.callbacks.delete(topic);
  }

  /**
   * Remove sensor measurement callback
   */
  offSensorMeasurement(sensorCode: string): void {
    this.measurementCallbacks.delete(sensorCode);
  }

  /**
   * Attempt to reconnect after connection loss
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    
    setTimeout(() => {
      if (!this.isConnected && this.wsUrl) {
        this.connect(this.wsUrl, this.wsToken).catch(() => {
          console.error('Reconnection attempt failed');
        });
      }
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      console.log('Disconnecting from WebSocket');
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.callbacks.clear();
      this.measurementCallbacks.clear();
      this.systemStatusCallback = null;
      this.postgresqlStatusCallback = null;
      this.connectionStatusCallbacks = [];
      this.subscribedSensors = [];
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get the list of currently subscribed sensors
   */
  getSubscribedSensors(): string[] {
    return [...this.subscribedSensors];
  }
}

// Singleton instance
export const mqttService = new MQTTService();
