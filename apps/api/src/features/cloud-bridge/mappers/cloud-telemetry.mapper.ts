import { TelemetryReading } from '../../telemetry/entities/telemetry-reading.entity';
import { CloudTelemetryMessageDto } from '../dto/cloud-telemetry-message.dto';

export function toCloudTelemetryMessage(reading: TelemetryReading, gatewayId: string): CloudTelemetryMessageDto {
  return {
    schemaVersion: '1.0',
    gatewayId,
    deviceId: reading.deviceId,
    telemetryId: reading.id,
    temperature: reading.temperature,
    humidity: reading.humidity,
    relayStatus: reading.relayStatus,
    relayActualStatus: reading.relayActualStatus ?? null,
    waterDetected: reading.waterDetected,
    observedAt: reading.observedAt.toISOString(),
    receivedAt: reading.receivedAt.toISOString(),
    ai: {
      isAnomaly: reading.aiIsAnomaly,
      riskLevel: reading.aiRiskLevel,
      anomalyScore: reading.aiAnomalyScore,
      suggestedAction: reading.aiSuggestedAction,
      reason: reading.aiReason,
      modelVersion: reading.aiModelVersion,
    },
  };
}
