import { eventService, EVENTS } from '../events';
import { errorService } from '../errors/service';
import { storage } from '../storage';
import type { DeviceConfig, DeviceInfo, DeviceReading, DeviceAlert, DeviceThresholds } from './types';

class DeviceService {
  private config: DeviceConfig = {
    autoConnect: true,
    retryAttempts: 3,
    retryDelay: 5000,
    connectionTimeout: 30000
  };

  private devices: Map<string, DeviceInfo> = new Map();
  private readings: Map<string, DeviceReading[]> = new Map();
  private alerts: Map<string, DeviceAlert[]> = new Map();
  private thresholds: Map<string, DeviceThresholds> = new Map();
  private connectionTimers: Map<string, number> = new Map();

  constructor() {
    this.loadStoredData();
    this.initializeDefaultThresholds();
  }

  private loadStoredData() {
    try {
      // Load devices
      const storedDevices = storage.get<DeviceInfo[]>('devices');
      if (storedDevices) {
        storedDevices.forEach(device => this.devices.set(device.id, device));
      }

      // Load readings
      const storedReadings = storage.get<Record<string, DeviceReading[]>>('deviceReadings');
      if (storedReadings) {
        Object.entries(storedReadings).forEach(([deviceId, readings]) => {
          this.readings.set(deviceId, readings);
        });
      }

      // Load alerts
      const storedAlerts = storage.get<Record<string, DeviceAlert[]>>('deviceAlerts');
      if (storedAlerts) {
        Object.entries(storedAlerts).forEach(([deviceId, alerts]) => {
          this.alerts.set(deviceId, alerts);
        });
      }
    } catch (error) {
      errorService.handleError({
        name: 'DeviceError',
        message: 'Failed to load stored device data',
        code: 'DEVICE_LOAD_ERROR',
        context: { error },
        timestamp: new Date().toISOString(),
        handled: true
      });
    }
  }

  private initializeDefaultThresholds() {
    const defaultThresholds: DeviceThresholds[] = [
      {
        type: 'blood_pressure',
        low: 90, // systolic
        high: 140, // systolic
        unit: 'mmHg'
      },
      {
        type: 'heart_rate',
        low: 60,
        high: 100,
        unit: 'bpm'
      },
      {
        type: 'blood_glucose',
        low: 70,
        high: 180,
        unit: 'mg/dL'
      },
      {
        type: 'oxygen',
        low: 95,
        high: 100,
        unit: '%'
      },
      {
        type: 'temperature',
        low: 97,
        high: 99,
        unit: '°F'
      }
    ];

    defaultThresholds.forEach(threshold => {
      this.thresholds.set(threshold.type, threshold);
    });
  }

  async connectDevice(deviceInfo: Omit<DeviceInfo, 'id' | 'status' | 'lastSync'>): Promise<DeviceInfo> {
    try {
      const device: DeviceInfo = {
        ...deviceInfo,
        id: crypto.randomUUID(),
        status: 'pairing',
        lastSync: new Date().toISOString()
      };

      // Simulate connection process
      await new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.config.connectionTimeout);

        this.connectionTimers.set(device.id, timer);

        // Simulate successful connection after 2 seconds
        setTimeout(() => {
          clearTimeout(timer);
          this.connectionTimers.delete(device.id);
          resolve(true);
        }, 2000);
      });

      device.status = 'connected';
      this.devices.set(device.id, device);
      this.saveDevices();

      eventService.emit(EVENTS.SYNC.COMPLETED, {
        type: 'device_connected',
        deviceId: device.id
      });

      return device;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect device';
      
      errorService.handleError({
        name: 'DeviceError',
        message: errorMessage,
        code: 'DEVICE_CONNECTION_ERROR',
        context: { deviceInfo, error },
        timestamp: new Date().toISOString(),
        handled: true
      });

      throw error;
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) return;

      // Clear any pending connection timer
      const timer = this.connectionTimers.get(deviceId);
      if (timer) {
        clearTimeout(timer);
        this.connectionTimers.delete(deviceId);
      }

      device.status = 'disconnected';
      this.devices.set(deviceId, device);
      this.saveDevices();

      eventService.emit(EVENTS.SYNC.COMPLETED, {
        type: 'device_disconnected',
        deviceId
      });
    } catch (error) {
      errorService.handleError({
        name: 'DeviceError',
        message: 'Failed to disconnect device',
        code: 'DEVICE_DISCONNECTION_ERROR',
        context: { deviceId, error },
        timestamp: new Date().toISOString(),
        handled: true
      });
    }
  }

  addReading(reading: Omit<DeviceReading, 'id'>): DeviceReading {
    try {
      const device = this.devices.get(reading.deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      const newReading: DeviceReading = {
        ...reading,
        id: crypto.randomUUID()
      };

      // Update device last sync time
      device.lastSync = newReading.timestamp;
      this.devices.set(device.id, device);

      // Add reading to storage
      const deviceReadings = this.readings.get(device.id) || [];
      deviceReadings.unshift(newReading);
      this.readings.set(device.id, deviceReadings);

      // Check thresholds and create alerts if needed
      this.checkThresholds(newReading);

      this.saveReadings();
      this.saveDevices();

      eventService.emit(EVENTS.SYNC.COMPLETED, {
        type: 'device_reading_added',
        deviceId: device.id,
        readingId: newReading.id
      });

      return newReading;
    } catch (error) {
      errorService.handleError({
        name: 'DeviceError',
        message: 'Failed to add device reading',
        code: 'DEVICE_READING_ERROR',
        context: { reading, error },
        timestamp: new Date().toISOString(),
        handled: true
      });
      throw error;
    }
  }

  private checkThresholds(reading: DeviceReading) {
    const threshold = this.thresholds.get(reading.type);
    if (!threshold) return;

    let value: number;
    if (reading.type === 'blood_pressure') {
      value = (reading.value as { systolic: number }).systolic;
    } else {
      value = reading.value as number;
    }

    if (value < threshold.low || value > threshold.high) {
      const alert: DeviceAlert = {
        id: crypto.randomUUID(),
        deviceId: reading.deviceId,
        type: 'out_of_range',
        severity: 'high',
        message: `${reading.type} reading (${value} ${reading.unit}) is outside normal range`,
        timestamp: new Date().toISOString(),
        acknowledged: false
      };

      const deviceAlerts = this.alerts.get(reading.deviceId) || [];
      deviceAlerts.unshift(alert);
      this.alerts.set(reading.deviceId, deviceAlerts);
      this.saveAlerts();

      eventService.emit(EVENTS.SYNC.COMPLETED, {
        type: 'device_alert_created',
        deviceId: reading.deviceId,
        alertId: alert.id
      });
    }
  }

  getReadings(deviceId: string, startDate?: string, endDate?: string): DeviceReading[] {
    const readings = this.readings.get(deviceId) || [];
    if (!startDate && !endDate) return readings;

    return readings.filter(reading => {
      const timestamp = new Date(reading.timestamp).getTime();
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Infinity;
      return timestamp >= start && timestamp <= end;
    });
  }

  getAlerts(deviceId: string, acknowledged?: boolean): DeviceAlert[] {
    const alerts = this.alerts.get(deviceId) || [];
    if (typeof acknowledged === 'undefined') return alerts;
    return alerts.filter(alert => alert.acknowledged === acknowledged);
  }

  acknowledgeAlert(deviceId: string, alertId: string): void {
    const alerts = this.alerts.get(deviceId);
    if (!alerts) return;

    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.saveAlerts();
    }
  }

  setThresholds(type: DeviceInfo['type'], thresholds: Omit<DeviceThresholds, 'type'>): void {
    this.thresholds.set(type, { type, ...thresholds });
  }

  getThresholds(type: DeviceInfo['type']): DeviceThresholds | undefined {
    return this.thresholds.get(type);
  }

  getDevices(): DeviceInfo[] {
    return Array.from(this.devices.values());
  }

  getDevice(deviceId: string): DeviceInfo | undefined {
    return this.devices.get(deviceId);
  }

  private saveDevices() {
    storage.set('devices', Array.from(this.devices.values()));
  }

  private saveReadings() {
    const readingsObj = Object.fromEntries(this.readings);
    storage.set('deviceReadings', readingsObj);
  }

  private saveAlerts() {
    const alertsObj = Object.fromEntries(this.alerts);
    storage.set('deviceAlerts', alertsObj);
  }

  configure(config: Partial<DeviceConfig>) {
    this.config = { ...this.config, ...config };
  }
}

export const deviceService = new DeviceService();