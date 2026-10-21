const DEVICE_ID_TOPIC_INDEX = 2;

export function extractDeviceIdFromTelemetryTopic(topic: string): string {
  const parts = topic.split('/');
  return parts[DEVICE_ID_TOPIC_INDEX] ?? 'unknown-device';
}

export function buildControlTopic(deviceId: string): string {
  return `iot/devices/${deviceId}/control`;
}

