import { AiRiskLevel } from '../../../common/enums/ai-risk-level.enum';
import { AiSuggestedAction } from '../../../common/enums/ai-suggested-action.enum';

export interface AiPredictionResponseDto {
  is_anomaly: boolean;
  risk_level: AiRiskLevel;
  anomaly_score: number;
  suggested_action: AiSuggestedAction;
  reason: string;
  model_version: string;
}

