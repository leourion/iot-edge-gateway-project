import { Controller, Get, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { toAlertResponse } from './mappers/alert.mapper';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async listLatest(@Query('limit') limit?: string) {
    const alerts = await this.alertsService.listLatest(Number(limit) || 30);
    return alerts.map(toAlertResponse);
  }
}

