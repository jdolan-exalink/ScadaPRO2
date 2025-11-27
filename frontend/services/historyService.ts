/**
 * History Service - Store and retrieve sensor historical data
 * Works even when MQTT is not available by storing data in SQLite
 */

import { dbManager } from './database';

export interface SensorHistoryPoint {
  timestamp: string;
  value: number;
  unit: string;
}

class HistoryService {
  private db = dbManager.getDatabase();

  /**
   * Store sensor value in history
   */
  async storeSensorValue(sensorCode: string, value: number, unit: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO sensor_history (sensor_code, value, unit, timestamp) VALUES (?, ?, ?, ?)`,
        [sensorCode, value, unit, new Date().toISOString()],
        (err) => {
          if (err) {
            console.error('Error storing sensor value:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Get sensor history for a specific time range
   */
  async getSensorHistory(sensorCode: string, hours: number = 24): Promise<SensorHistoryPoint[]> {
    return new Promise((resolve) => {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      this.db.all(
        `SELECT timestamp, value, unit FROM sensor_history
         WHERE sensor_code = ? AND timestamp >= ?
         ORDER BY timestamp ASC`,
        [sensorCode, cutoffTime],
        (err, rows: any[]) => {
          if (err) {
            console.error('Error getting sensor history:', err);
            resolve([]);
          } else {
            const history: SensorHistoryPoint[] = rows.map(row => ({
              timestamp: row.timestamp,
              value: row.value,
              unit: row.unit
            }));
            resolve(history);
          }
        }
      );
    });
  }

  /**
   * Get latest value for a sensor
   */
  async getLatestSensorValue(sensorCode: string): Promise<SensorHistoryPoint | null> {
    return new Promise((resolve) => {
      this.db.get(
        `SELECT timestamp, value, unit FROM sensor_history
         WHERE sensor_code = ?
         ORDER BY timestamp DESC
         LIMIT 1`,
        [sensorCode],
        (err, row: any) => {
          if (err || !row) {
            resolve(null);
          } else {
            resolve({
              timestamp: row.timestamp,
              value: row.value,
              unit: row.unit
            });
          }
        }
      );
    });
  }

  /**
   * Clean old history data (keep only last 30 days)
   */
  async cleanOldData(): Promise<void> {
    return new Promise((resolve) => {
      const cutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      this.db.run(
        `DELETE FROM sensor_history WHERE timestamp < ?`,
        [cutoffTime],
        (err) => {
          if (err) {
            console.error('Error cleaning old data:', err);
          } else {
            console.log('Old sensor history data cleaned');
          }
          resolve();
        }
      );
    });
  }

  /**
   * Get all sensor codes that have history data
   */
  async getAvailableSensors(): Promise<string[]> {
    return new Promise((resolve) => {
      this.db.all(
        `SELECT DISTINCT sensor_code FROM sensor_history ORDER BY sensor_code`,
        [],
        (err, rows: any[]) => {
          if (err) {
            console.error('Error getting available sensors:', err);
            resolve([]);
          } else {
            resolve(rows.map(row => row.sensor_code));
          }
        }
      );
    });
  }
}

export const historyService = new HistoryService();