import { Controller, Get, Param, Query } from '@nestjs/common';
import { toTelemetryResponse } from './mappers/telemetry.mapper';
import { TelemetryService } from './telemetry.service';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get()
  async listLatest(@Query('limit') limit?: string) {
    const readings = await this.telemetryService.listLatest(Number(limit) || 50);
    return readings.map(toTelemetryResponse);
  }

  @Get('devices/:deviceId')
  async listByDevice(@Param('deviceId') deviceId: string, @Query('limit') limit?: string) {
    const readings = await this.telemetryService.listByDevice(deviceId, Number(limit) || 100);
    return readings.map(toTelemetryResponse);
  }
}

