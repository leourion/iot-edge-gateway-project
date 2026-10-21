import { Injectable } from '@nestjs/common';
import { AlertsService } from '../alerts/alerts.service';
import { toAlertResponse } from '../alerts/mappers/alert.mapper';
import { DevicesService } from '../devices/devices.service';
import { toDeviceResponse } from '../devices/mappers/device.mapper';
import { toTelemetryResponse } from '../telemetry/mappers/telemetry.mapper';
import { TelemetryService } from '../telemetry/telemetry.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly telemetryService: TelemetryService,
    private readonly alertsService: AlertsService,
  ) {}

  async getOverview() {
    const [devices, readings, alerts] = await Promise.all([
      this.devicesService.listDevices(),
      this.telemetryService.listLatest(20),
      this.alertsService.listLatest(10),
    ]);

    return {
      summary: {
        totalDevices: devices.length,
        onlineDevices: devices.filter((device) => device.status === 'ONLINE').length,
        activeAlerts: alerts.length,
      },
      devices: devices.map(toDeviceResponse),
      latestReadings: readings.map(toTelemetryResponse),
      latestAlerts: alerts.map(toAlertResponse),
    };
  }
}

