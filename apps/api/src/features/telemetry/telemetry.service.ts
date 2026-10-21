import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseTelemetryTimestamp } from '../../common/utils/date.util';
import { AiService } from '../ai/ai.service';
import { AutomationService } from '../automation/automation.service';
import { CloudBridgeService } from '../cloud-bridge/cloud-bridge.service';
import { DevicesService } from '../devices/devices.service';
import { TelemetryPayloadDto } from './dto/telemetry-payload.dto';
import { TelemetryReading } from './entities/telemetry-reading.entity';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectRepository(TelemetryReading)
    private readonly readingsRepository: Repository<TelemetryReading>,
    private readonly devicesService: DevicesService,
    private readonly automationService: AutomationService,
    private readonly aiService: AiService,
    private readonly cloudBridgeService: CloudBridgeService,
  ) {}

  async recordTelemetry(deviceId: string, payload: TelemetryPayloadDto): Promise<TelemetryReading> {
    const observedAt = parseTelemetryTimestamp(payload.timestamp);
    await this.devicesService.upsertFromTelemetry({
      deviceId,
      temperature: payload.temperature,
      humidity: payload.humidity,
      relayStatus: payload.relayStatus,
      observedAt,
    });

    const aiPrediction = await this.aiService.predict({
      device_id: deviceId,
      temperature: payload.temperature,
      humidity: payload.humidity,
      water_detected: payload.waterDetected ?? false,
      relay_status: payload.relayStatus,
      observed_at: observedAt.toISOString(),
    });

    const reading = this.readingsRepository.create({
      deviceId,
      temperature: payload.temperature,
      humidity: payload.humidity,
      relayStatus: payload.relayStatus,
      relayActualStatus: payload.relayActualStatus ?? null,
      waterDetected: payload.waterDetected ?? false,
      observedAt,
      aiIsAnomaly: aiPrediction.is_anomaly,
      aiRiskLevel: aiPrediction.risk_level,
      aiAnomalyScore: aiPrediction.anomaly_score,
      aiSuggestedAction: aiPrediction.suggested_action,
      aiReason: aiPrediction.reason,
      aiModelVersion: aiPrediction.model_version,
    });
    const savedReading = await this.readingsRepository.save(reading);

    await this.automationService.evaluateReading(savedReading);
    await this.cloudBridgeService.publishTelemetry(savedReading);
    return savedReading;
  }

  async listLatest(limit = 50): Promise<TelemetryReading[]> {
    return this.readingsRepository.find({
      order: { observedAt: 'DESC' },
      take: limit,
    });
  }

  async listByDevice(deviceId: string, limit = 100): Promise<TelemetryReading[]> {
    return this.readingsRepository.find({
      where: { deviceId },
      order: { observedAt: 'DESC' },
      take: limit,
    });
  }
}
