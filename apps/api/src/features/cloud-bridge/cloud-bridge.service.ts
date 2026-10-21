import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { parseBoolean } from '../../common/utils/environment.util';
import { TelemetryReading } from '../telemetry/entities/telemetry-reading.entity';
import { buildCloudGatewayStatusTopic, buildCloudTelemetryTopic } from './cloud-bridge-topic.util';
import { toCloudTelemetryMessage } from './mappers/cloud-telemetry.mapper';

@Injectable()
export class CloudBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CloudBridgeService.name);
  private readonly enabled: boolean;
  private readonly gatewayId: string;
  private readonly cloudUrl: string;
  private client: MqttClient | null = null;

  constructor(private readonly config: ConfigService) {
    this.enabled = parseBoolean(this.config.get<string>('CLOUD_MQTT_ENABLED'), false);
    this.gatewayId = this.config.get<string>('GATEWAY_ID', 'edge-gateway-001');
    this.cloudUrl = this.config.get<string>('CLOUD_MQTT_URL', '');
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('CloudBridge disabled. Set CLOUD_MQTT_ENABLED=true to publish to cloud broker.');
      return;
    }

    if (!this.cloudUrl) {
      this.logger.warn('CloudBridge enabled but CLOUD_MQTT_URL is empty.');
      return;
    }

    this.client = mqtt.connect(this.cloudUrl, this.buildClientOptions());

    this.client.on('connect', () => {
      this.logger.log(`Connected to cloud MQTT broker at ${this.cloudUrl}`);
      this.publishGatewayStatus('ONLINE').catch((error) => {
        this.logger.warn(`Could not publish cloud gateway status: ${error.message}`);
      });
    });

    this.client.on('error', (error) => {
      this.logger.error(`Cloud MQTT error: ${error.message}`);
    });
  }

  onModuleDestroy(): void {
    this.client?.end();
  }

  async publishTelemetry(reading: TelemetryReading): Promise<void> {
    if (!this.client?.connected) {
      return;
    }

    const topic = buildCloudTelemetryTopic(reading.deviceId);
    const payload = toCloudTelemetryMessage(reading, this.gatewayId);
    await this.publishJson(topic, payload);
  }

  private async publishGatewayStatus(status: 'ONLINE' | 'OFFLINE'): Promise<void> {
    const topic = buildCloudGatewayStatusTopic(this.gatewayId);
    await this.publishJson(
      topic,
      {
        schemaVersion: '1.0',
        gatewayId: this.gatewayId,
        status,
        timestamp: new Date().toISOString(),
      },
      true,
    );
  }

  private buildClientOptions(): IClientOptions {
    return {
      clientId: this.config.get<string>('CLOUD_MQTT_CLIENT_ID', `${this.gatewayId}-${process.pid}`),
      username: this.config.get<string>('CLOUD_MQTT_USERNAME') || undefined,
      password: this.config.get<string>('CLOUD_MQTT_PASSWORD') || undefined,
      reconnectPeriod: Number(this.config.get('CLOUD_MQTT_RECONNECT_MS', 5000)),
      clean: true,
    };
  }

  private publishJson(topic: string, payload: unknown, retain = false): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client?.connected) {
        reject(new Error('Cloud MQTT client is not connected'));
        return;
      }

      this.client.publish(topic, JSON.stringify(payload), { qos: 1, retain }, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

