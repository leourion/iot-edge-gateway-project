import type { Alert, DashboardOverview, Device, TelemetryReading } from '@/features/dashboard/types';

/**
 * Deterministic-ish pseudo-random generator so the demo looks the same on
 * every reload instead of jumping around. Swap this whole file out once the
 * real MQTT -> API pipeline (apps/api) is producing telemetry — the shape of
 * `DashboardOverview` is unchanged, so nothing downstream needs to move.
 */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rnd = seeded(42);

export const MOCK_DEVICES: Pick<Device, 'id' | 'name'>[] = [
  { id: 'esp32-01', name: 'ESP32-01 · Living room' },
  { id: 'esp32-02', name: 'ESP32-02 · Bedroom' },
  { id: 'esp32-03', name: 'ESP32-03 · Garden' },
];

const HISTORY_LENGTH = 60;
const INTERVAL_MS = 3000;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function buildHistory(deviceId: string, offset: number): TelemetryReading[] {
  const now = Date.now();
  let temp = 24 + offset * 2.4;
  let hum = 55 - offset * 3;
  const out: TelemetryReading[] = [];
  for (let i = 0; i < HISTORY_LENGTH; i++) {
    temp = clamp(temp + (rnd() - 0.5) * 0.9, 18, 38);
    hum = clamp(hum + (rnd() - 0.5) * 2.2, 30, 85);
    const anomalyScore = clamp((Math.abs(temp - 26) / 12 + Math.abs(hum - 50) / 60) * 0.5 + rnd() * 0.08, 0, 1);
    const observedAt = new Date(now - (HISTORY_LENGTH - 1 - i) * INTERVAL_MS).toISOString();
    out.push({
      id: `${deviceId}-${i}`,
      deviceId,
      temperature: +temp.toFixed(1),
      humidity: +hum.toFixed(1),
      relayStatus: temp > 30 ? 'ON' : 'OFF',
      relayActualStatus: null,
      waterDetected: false,
      ai: {
        isAnomaly: anomalyScore > 0.7,
        riskLevel: anomalyScore > 0.7 ? 'critical' : anomalyScore > 0.4 ? 'warning' : 'normal',
        anomalyScore: +anomalyScore.toFixed(2),
        suggestedAction: temp > 32 ? 'TURN_RELAY_ON' : 'NONE',
        reason: temp > 32 ? 'Temperature trending above comfort range' : null,
        modelVersion: 'iforest-v0.3',
      },
      observedAt,
      receivedAt: observedAt,
    });
  }
  return out;
}

const deviceHistoryCache = new Map<string, TelemetryReading[]>();

/** Returns (and memoises) the mock history for one device, so switching device
 * tabs doesn't regenerate a totally different-looking series every render. */
export function getDeviceHistory(deviceId: string): TelemetryReading[] {
  const index = MOCK_DEVICES.findIndex((d) => d.id === deviceId);
  if (!deviceHistoryCache.has(deviceId)) {
    deviceHistoryCache.set(deviceId, buildHistory(deviceId, index < 0 ? 0 : index));
  }
  return deviceHistoryCache.get(deviceId)!;
}

export function generateMockOverview(): DashboardOverview {
  const devices: Device[] = MOCK_DEVICES.map((d, i) => {
    const history = getDeviceHistory(d.id);
    const latest = history[history.length - 1];
    return {
      id: d.id,
      name: d.name,
      status: i === 2 ? 'OFFLINE' : 'ONLINE',
      relayStatus: latest.relayStatus,
      latestTemperature: latest.temperature,
      latestHumidity: latest.humidity,
      lastSeenAt: i === 2 ? new Date(Date.now() - 41 * 60_000).toISOString() : latest.observedAt,
    };
  });

  const latestReadings = getDeviceHistory(MOCK_DEVICES[0].id);

  const latestAlerts: Alert[] = [
    {
      id: 'a1',
      deviceId: 'esp32-01',
      severity: 'WARNING',
      code: 'TEMP_HIGH',
      message: 'Temperature trending above 30°C for 10+ minutes',
      createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    },
    {
      id: 'a2',
      deviceId: 'esp32-03',
      severity: 'CRITICAL',
      code: 'DEVICE_OFFLINE',
      message: 'No telemetry received for 41 minutes',
      createdAt: new Date(Date.now() - 41 * 60_000).toISOString(),
    },
  ];

  return {
    summary: {
      totalDevices: devices.length,
      onlineDevices: devices.filter((d) => d.status === 'ONLINE').length,
      activeAlerts: latestAlerts.length,
    },
    devices,
    latestReadings,
    latestAlerts,
  };
}

/** Appends one new simulated reading and drops the oldest, for the live 3s tick.
 * Also updates the memoised cache so switching device tabs afterwards shows
 * the ticked data instead of the original seed. */
export function tickDeviceHistory(deviceId: string): TelemetryReading[] {
  const prev = getDeviceHistory(deviceId);
  const next = nextMockReading(deviceId, prev);
  deviceHistoryCache.set(deviceId, next);
  return next;
}

function nextMockReading(deviceId: string, prev: TelemetryReading[]): TelemetryReading[] {
  const last = prev[prev.length - 1];
  const temp = clamp(last.temperature + (rnd() - 0.5) * 0.9, 18, 38);
  const hum = clamp(last.humidity + (rnd() - 0.5) * 2.2, 30, 85);
  const anomalyScore = clamp((Math.abs(temp - 26) / 12 + Math.abs(hum - 50) / 60) * 0.5 + rnd() * 0.08, 0, 1);
  const observedAt = new Date().toISOString();
  const next: TelemetryReading = {
    id: `${deviceId}-${Date.now()}`,
    deviceId,
    temperature: +temp.toFixed(1),
    humidity: +hum.toFixed(1),
    relayStatus: temp > 30 ? 'ON' : 'OFF',
    relayActualStatus: null,
    waterDetected: false,
    ai: {
      isAnomaly: anomalyScore > 0.7,
      riskLevel: anomalyScore > 0.7 ? 'critical' : anomalyScore > 0.4 ? 'warning' : 'normal',
      anomalyScore: +anomalyScore.toFixed(2),
      suggestedAction: temp > 32 ? 'TURN_RELAY_ON' : 'NONE',
      reason: temp > 32 ? 'Temperature trending above comfort range' : null,
      modelVersion: 'iforest-v0.3',
    },
    observedAt,
    receivedAt: observedAt,
  };
  return [...prev.slice(1), next];
}

export const MOCK_TICK_INTERVAL_MS = INTERVAL_MS;
