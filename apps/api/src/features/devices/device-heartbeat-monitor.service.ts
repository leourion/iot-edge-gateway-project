import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DevicesService } from './devices.service';

@Injectable()
export class DeviceHeartbeatMonitorService {
  private readonly logger = new Logger(DeviceHeartbeatMonitorService.name);
  private readonly offlineAfterSeconds: number;

  constructor(
    private readonly config: ConfigService,
    private readonly devicesService: DevicesService,
  ) {
    this.offlineAfterSeconds = Number(this.config.get('DEVICE_OFFLINE_AFTER_SECONDS', 15));
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async markStaleDevicesOffline(): Promise<void> {
    const staleBefore = new Date(Date.now() - this.offlineAfterSeconds * 1000);
    const affected = await this.devicesService.markStaleDevicesOffline(staleBefore);

    if (affected > 0) {
      this.logger.warn(`Marked ${affected} stale device(s) offline`);
    }
  }
}
