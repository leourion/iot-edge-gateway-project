import { AiRiskLevel } from '../../../common/enums/ai-risk-level.enum';
import { AiSuggestedAction } from '../../../common/enums/ai-suggested-action.enum';
import { RelayStatus } from '../../../common/enums/relay-status.enum';

export interface CloudTelemetryMessageDto {
  schemaVersion: '1.0';
  gatewayId: string;
  deviceId: string;
  telemetryId: string;
  temperature: number;
  humidity: number;
  relayStatus: RelayStatus;
  relayActualStatus: RelayStatus | null;
  waterDetected: boolean;
  observedAt: string;
  receivedAt: string;
  ai: {
    isAnomaly: boolean;
    riskLevel: AiRiskLevel;
    anomalyScore: number;
    suggestedAction: AiSuggestedAction;
    reason: string | null;
    modelVersion: string | null;
  };
}
