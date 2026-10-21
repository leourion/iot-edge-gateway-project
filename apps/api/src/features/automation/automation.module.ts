import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { AutomationService } from './automation.service';

@Module({
  imports: [AlertsModule],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}

