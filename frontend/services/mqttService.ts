/**
 * MQTT Service - WebSocket Real-time Connection Manager
 * 
 * Provides a unified interface for WebSocket connections to the backend's /ws/realtime endpoint.
 * Handles subscription management and event callbacks for system metrics.
 */

import { MQTTSystemStatus, PostgreSQLStats, CollectorStats } from '../types';

type MessageCallback = (payload: any, topic?: string) => void;
type ConnectionChangeCallback = (connected: boolean) => void;
type SystemStatusCallback = (status: MQTTSystemStatus) => void;
type PostgreSQLStatusCallback = (stats: PostgreSQLStats) => void;

class MQTTService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private token: string = '';
  private isConnecting: boolean = false;
  private messageCallbacks: Map<string, Set<MessageCallback>> = new Map();
  private connectionChangeCallbacks: Set<ConnectionChangeCallback> = new Set();
  private systemStatusCallbacks: Set<SystemStatusCallback> = new Set();
  private postgresStatusCallbacks: Set<PostgreSQLStatusCallback> = new Set();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Connect to WebSocket endpoint
   */
  async connect(wsUrl: string, token: string = ''): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('📡 Already connected to WebSocket');
        resolve();
        return;
      }

      if (this.isConnecting) {
        console.log('📡 Connection in progress...');
        resolve();
        return;
      }

      this.isConnecting = true;
      this.url = wsUrl;
      this.token = token;

      try {
        // Add token to URL if provided
        const url = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;
        console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyConnectionChange(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnecting = false;
          this.notifyConnectionChange(false);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('📡 WebSocket disconnected');
          this.isConnecting = false;
          this.notifyConnectionChange(false);
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        this.notifyConnectionChange(false);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.notifyConnectionChange(false);
  }

  /**
   * Subscribe to MQTT topic pattern
   */
  subscribe(topicPattern: string, callback: MessageCallback): void {
    if (!this.messageCallbacks.has(topicPattern)) {
      this.messageCallbacks.set(topicPattern, new Set());
    }
    this.messageCallbacks.get(topicPattern)!.add(callback);

    // Send subscription message to backend
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          action: 'subscribe',
          topic: topicPattern,
        })
      );
    }
  }

  /**
   * Unsubscribe from MQTT topic pattern
   */
  unsubscribe(topicPattern: string, callback?: MessageCallback): void {
    if (!this.messageCallbacks.has(topicPattern)) {
      return;
    }

    const callbacks = this.messageCallbacks.get(topicPattern)!;
    if (callback) {
      callbacks.delete(callback);
    } else {
      callbacks.clear();
    }

    if (callbacks.size === 0) {
      this.messageCallbacks.delete(topicPattern);

      // Send unsubscription message to backend
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            action: 'unsubscribe',
            topic: topicPattern,
          })
        );
      }
    }
  }

  /**
   * Register callback for connection state changes
   */
  onConnectionChange(callback: ConnectionChangeCallback): void {
    this.connectionChangeCallbacks.add(callback);
  }

  /**
   * Unregister callback for connection state changes
   */
  offConnectionChange(callback: ConnectionChangeCallback): void {
    this.connectionChangeCallbacks.delete(callback);
  }

  /**
   * Register callback for system status updates from MQTT
   */
  onSystemStatus(callback: SystemStatusCallback): void {
    this.systemStatusCallbacks.add(callback);
  }

  /**
   * Unregister callback for system status updates
   */
  offSystemStatus(callback: SystemStatusCallback): void {
    this.systemStatusCallbacks.delete(callback);
  }

  /**
   * Register callback for PostgreSQL status updates from MQTT
   */
  onPostgreSQLStatus(callback: PostgreSQLStatusCallback): void {
    this.postgresStatusCallbacks.add(callback);
  }

  /**
   * Unregister callback for PostgreSQL status updates
   */
  offPostgreSQLStatus(callback: PostgreSQLStatusCallback): void {
    this.postgresStatusCallbacks.delete(callback);
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Private: Handle incoming messages
   */
  private handleMessage(data: any): void {
    // Handle system status messages
    if (data.type === 'system_status' || data.topic === 'system/status') {
      this.notifySystemStatus(data);
      return;
    }

    // Handle PostgreSQL status messages
    if (data.type === 'postgresql_status' || data.topic === 'system/postgresql') {
      this.notifyPostgreSQLStatus(data);
      return;
    }

    // Handle sensor/generic messages with topic and payload
    if (data.topic && data.payload !== undefined) {
      this.notifyMessage(data.topic, data.payload);
      return;
    }

    // Handle direct payload format
    if (data.type === 'measurement' || data.sensor_code) {
      // Convert to topic format for consistency
      if (data.topic) {
        this.notifyMessage(data.topic, data);
      } else {
        this.notifyMessage('sensors/data', data);
      }
      return;
    }

    // Unknown format - broadcast as generic message
    console.warn('⚠️ Unknown message format:', data);
  }

  /**
   * Private: Notify subscribers of message
   */
  private notifyMessage(topic: string, payload: any): void {
    // Notify exact topic subscribers
    const callbacks = this.messageCallbacks.get(topic);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload, topic);
        } catch (error) {
          console.error('Error in message callback:', error);
        }
      });
    }

    // Notify wildcard subscribers
    for (const [pattern, patternCallbacks] of this.messageCallbacks.entries()) {
      if (pattern === '*' || this.topicMatches(topic, pattern)) {
        patternCallbacks.forEach((cb) => {
          try {
            cb(payload, topic);
          } catch (error) {
            console.error('Error in message callback:', error);
          }
        });
      }
    }
  }

  /**
   * Private: Notify connection state changes
   */
  private notifyConnectionChange(connected: boolean): void {
    this.connectionChangeCallbacks.forEach((cb) => {
      try {
        cb(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  /**
   * Private: Notify system status updates
   */
  private notifySystemStatus(status: MQTTSystemStatus): void {
    this.systemStatusCallbacks.forEach((cb) => {
      try {
        cb(status);
      } catch (error) {
        console.error('Error in system status callback:', error);
      }
    });
  }

  /**
   * Private: Notify PostgreSQL status updates
   */
  private notifyPostgreSQLStatus(stats: PostgreSQLStats): void {
    this.postgresStatusCallbacks.forEach((cb) => {
      try {
        cb(stats);
      } catch (error) {
        console.error('Error in PostgreSQL status callback:', error);
      }
    });
  }

  /**
   * Private: Check if topic matches pattern (supports wildcards)
   */
  private topicMatches(topic: string, pattern: string): boolean {
    // Handle wildcards: * = any single level, # = any remaining levels
    if (pattern === '*' || pattern === '#') {
      return true;
    }

    const topicParts = topic.split('/');
    const patternParts = pattern.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      const part = patternParts[i];

      if (part === '#') {
        // # matches remaining levels
        return true;
      }

      if (part === '*') {
        // * matches exactly one level
        if (!topicParts[i]) {
          return false;
        }
        continue;
      }

      if (part !== topicParts[i]) {
        return false;
      }
    }

    return topicParts.length === patternParts.length;
  }

  /**
   * Private: Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `❌ Failed to reconnect after ${this.maxReconnectAttempts} attempts`
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `⏳ Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.url, this.token).catch((error) => {
        console.error('Reconnect failed:', error);
      });
    }, delay);
  }
}

// Export singleton instance
export const mqttService = new MQTTService();
