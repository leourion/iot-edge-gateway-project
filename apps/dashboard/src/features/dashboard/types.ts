export type DeviceStatus = 'ONLINE' | 'OFFLINE';
export type RelayStatus = 'ON' | 'OFF';
export type RelayControlCommand = RelayStatus | 'AUTO';
export type AiRiskLevel = 'normal' | 'warning' | 'critical' | 'unavailable';
export type AiSuggestedAction = 'NONE' | 'TURN_RELAY_ON' | 'TURN_RELAY_OFF';

export interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  relayStatus: RelayStatus;
  latestTemperature: number | null;
  latestHumidity: number | null;
  lastSeenAt: string | null;
}

export interface TelemetryReading {
  id: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  relayStatus: RelayStatus;
  relayActualStatus: RelayStatus | null;
  waterDetected: boolean;
  ai: {
    isAnomaly: boolean;
    riskLevel: AiRiskLevel;
    anomalyScore: number;
    suggestedAction: AiSuggestedAction;
    reason: string | null;
    modelVersion: string | null;
  };
  observedAt: string;
  receivedAt: string;
}

export interface Alert {
  id: string;
  deviceId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  code: string;
  message: string;
  createdAt: string;
}

export interface DashboardOverview {
  summary: {
    totalDevices: number;
    onlineDevices: number;
    activeAlerts: number;
  };
  devices: Device[];
  latestReadings: TelemetryReading[];
  latestAlerts: Alert[];
}
