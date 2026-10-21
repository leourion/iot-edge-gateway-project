import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertSeverity } from '../../common/enums/alert-severity.enum';
import { AlertsService } from '../alerts/alerts.service';
import { TelemetryReading } from '../telemetry/entities/telemetry-reading.entity';

@Injectable()
export class AutomationService {
  private readonly temperatureThreshold: number;
  private readonly humidityThreshold: number;

  constructor(
    private readonly config: ConfigService,
    private readonly alertsService: AlertsService,
  ) {
    this.temperatureThreshold = Number(this.config.get('TEMPERATURE_ALERT_THRESHOLD', 35));
    this.humidityThreshold = Number(this.config.get('HUMIDITY_ALERT_THRESHOLD', 80));
  }

  async evaluateReading(reading: TelemetryReading): Promise<void> {
    await Promise.all([
      this.createTemperatureAlertIfNeeded(reading),
      this.createHumidityAlertIfNeeded(reading),
    ]);
  }

  private async createTemperatureAlertIfNeeded(reading: TelemetryReading): Promise<void> {
    if (reading.temperature < this.temperatureThreshold) {
      return;
    }

    await this.alertsService.createAlert({
      deviceId: reading.deviceId,
      severity: AlertSeverity.Warning,
      code: 'HIGH_TEMPERATURE',
      message: `Temperature ${reading.temperature}C exceeded ${this.temperatureThreshold}C`,
    });
  }

  private async createHumidityAlertIfNeeded(reading: TelemetryReading): Promise<void> {
    if (reading.humidity < this.humidityThreshold) {
      return;
    }

    await this.alertsService.createAlert({
      deviceId: reading.deviceId,
      severity: AlertSeverity.Warning,
      code: 'HIGH_HUMIDITY',
      message: `Humidity ${reading.humidity}% exceeded ${this.humidityThreshold}%`,
    });
  }
}

