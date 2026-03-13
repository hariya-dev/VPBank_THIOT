import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface TelemetryData {
  gatewayId: string;
  deviceId: number;
  temperature: number | null;
  humidity: number | null;
  timestamp: number;
  status: string;
}

export interface AlarmData {
  gatewayId: string;
  deviceId: number;
  alarmType: string;
  severity: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export interface DeviceStatusData {
  gatewayId: string;
  deviceId: number;
  status: string;
  lastSeen: number;
}

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  isConnected = signal(false);

  // Real-time signals
  latestTelemetry = signal<TelemetryData | null>(null);
  latestAlarm = signal<AlarmData | null>(null);
  latestStatusChange = signal<DeviceStatusData | null>(null);

  // Aggregate state: gateway → latest telemetry
  telemetryMap = signal<Map<string, TelemetryData>>(new Map());

  constructor(private authService: AuthService) {}

  async start() {
    const token = this.authService.getToken();
    if (!token) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 1000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Register handlers
    this.connection.on('ReceiveTelemetry', (data: TelemetryData) => {
      this.latestTelemetry.set(data);
      const map = new Map(this.telemetryMap());
      map.set(data.gatewayId, data);
      this.telemetryMap.set(map);
    });

    this.connection.on('ReceiveAlarm', (data: AlarmData) => {
      this.latestAlarm.set(data);
    });

    this.connection.on('DeviceStatusChanged', (data: DeviceStatusData) => {
      this.latestStatusChange.set(data);
    });

    this.connection.onreconnecting(() => this.isConnected.set(false));
    this.connection.onreconnected(() => {
      this.isConnected.set(true);
      this.joinAllGroup();
    });
    this.connection.onclose(() => this.isConnected.set(false));

    try {
      await this.connection.start();
      this.isConnected.set(true);
      await this.joinAllGroup();
    } catch (err) {
      console.error('SignalR connection failed:', err);
    }
  }

  async joinAllGroup() {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinAllGroup');
    }
  }

  async joinDeviceGroup(gatewayId: string) {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('JoinDeviceGroup', gatewayId);
    }
  }

  async leaveGroup(groupName: string) {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke('LeaveGroup', groupName);
    }
  }

  async stop() {
    if (this.connection) {
      await this.connection.stop();
      this.isConnected.set(false);
    }
  }
}
