export function buildCloudTelemetryTopic(deviceId: string): string {
  return `cloud/iot/devices/${deviceId}/telemetry`;
}

export function buildCloudGatewayStatusTopic(gatewayId: string): string {
  return `cloud/iot/gateways/${gatewayId}/status`;
}

