import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mqtt, { MqttClient } from 'mqtt';
import { RelayControlCommand } from '../../common/enums/relay-control-command.enum';
import { buildControlTopic, extractDeviceIdFromTelemetryTopic } from '../../common/utils/topic.util';
import { TelemetryService } from '../telemetry/telemetry.service';
import { parseTelemetryPayload } from './mqtt-payload.parser';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly telemetryService: TelemetryService,
  ) {}

  onModuleInit(): void {
    const mqttUrl = this.config.get<string>('MQTT_URL', 'mqtt://localhost:1883');
    const telemetryTopic = this.config.get<string>('MQTT_TELEMETRY_TOPIC', 'iot/devices/+/telemetry');
    const username = this.config.get<string>('MQTT_USERNAME');
    const password = this.config.get<string>('MQTT_PASSWORD');

    this.client = mqtt.connect(mqttUrl, {
      clientId: `iot-api-${process.pid}`,
      reconnectPeriod: 3000,
      ...(username ? { username } : {}),
      ...(password ? { password } : {}),
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT broker at ${mqttUrl}`);
      this.client?.subscribe(telemetryTopic, (error, granted) => {
        if (error) {
          this.logger.error(`Could not subscribe to ${telemetryTopic}: ${error.message}`);
          return;
        }

        const topics = granted?.map(({ topic, qos }) => `${topic} (QoS ${qos})`).join(', ');
        this.logger.log(`Subscribed to MQTT telemetry: ${topics || telemetryTopic}`);
      });
    });

    this.client.on('message', (topic, payload) => {
      this.logger.log(`Received MQTT message on ${topic}`);
      void this.handleTelemetryMessage(topic, payload).catch((error: unknown) => {
        this.logger.error(
          `Could not save telemetry from ${topic}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    });

    this.client.on('error', (error) => {
      this.logger.error(`MQTT error: ${error.message}`);
    });
  }

  onModuleDestroy(): void {
    this.client?.end();
  }

  async publishRelayCommand(deviceId: string, relayStatus: RelayControlCommand): Promise<void> {
    const topic = buildControlTopic(deviceId);
    await this.publish(topic, relayStatus);
  }

  private async handleTelemetryMessage(topic: string, payloadBuffer: Buffer): Promise<void> {
    const payload = parseTelemetryPayload(payloadBuffer);
    if (!payload) {
      this.logger.warn(`Ignored invalid telemetry payload on topic ${topic}`);
      return;
    }

    const deviceId = extractDeviceIdFromTelemetryTopic(topic);
    await this.telemetryService.recordTelemetry(deviceId, payload);
  }

  private publish(topic: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client?.connected) {
        reject(new Error('MQTT client is not connected'));
        return;
      }

      this.client.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
