import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout } from 'rxjs';
import { AiRiskLevel } from '../../common/enums/ai-risk-level.enum';
import { AiSuggestedAction } from '../../common/enums/ai-suggested-action.enum';
import { AiPredictionRequestDto } from './dto/ai-prediction-request.dto';
import { AiPredictionResponseDto } from './dto/ai-prediction-response.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly serviceUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.serviceUrl = this.config.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    this.requestTimeoutMs = Number(this.config.get('AI_SERVICE_TIMEOUT_MS', 1500));
  }

  async predict(input: AiPredictionRequestDto): Promise<AiPredictionResponseDto> {
    try {
      const response = await firstValueFrom(
        this.http
          .post<AiPredictionResponseDto>(`${this.serviceUrl}/predict`, input)
          .pipe(timeout(this.requestTimeoutMs)),
      );

      return response.data;
    } catch (error) {
      this.logger.warn(`AI prediction unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
      return this.fallbackPrediction();
    }
  }

  private fallbackPrediction(): AiPredictionResponseDto {
    return {
      is_anomaly: false,
      risk_level: AiRiskLevel.Unavailable,
      anomaly_score: 0,
      suggested_action: AiSuggestedAction.None,
      reason: 'AI service is unavailable. Telemetry was stored without AI inference.',
      model_version: 'unavailable',
    };
  }
}

