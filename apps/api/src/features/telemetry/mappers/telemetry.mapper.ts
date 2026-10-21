import { TelemetryResponseDto } from '../dto/telemetry-response.dto';
import { TelemetryReading } from '../entities/telemetry-reading.entity';

export function toTelemetryResponse(reading: TelemetryReading): TelemetryResponseDto {
  return {
    id: reading.id,
    deviceId: reading.deviceId,
    temperature: reading.temperature,
    humidity: reading.humidity,
    relayStatus: reading.relayStatus,
    relayActualStatus: reading.relayActualStatus ?? null,
    waterDetected: reading.waterDetected,
    ai: {
      isAnomaly: reading.aiIsAnomaly,
      riskLevel: reading.aiRiskLevel,
      anomalyScore: reading.aiAnomalyScore,
      suggestedAction: reading.aiSuggestedAction,
      reason: reading.aiReason,
      modelVersion: reading.aiModelVersion,
    },
    observedAt: reading.observedAt.toISOString(),
    receivedAt: reading.receivedAt.toISOString(),
  };
}
