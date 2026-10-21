import { RelayStatus } from '../../../common/enums/relay-status.enum';
import { AiRiskLevel } from '../../../common/enums/ai-risk-level.enum';
import { AiSuggestedAction } from '../../../common/enums/ai-suggested-action.enum';

export interface TelemetryResponseDto {
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
