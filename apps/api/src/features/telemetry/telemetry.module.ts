import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { AutomationModule } from '../automation/automation.module';
import { CloudBridgeModule } from '../cloud-bridge/cloud-bridge.module';
import { DevicesModule } from '../devices/devices.module';
import { TelemetryReading } from './entities/telemetry-reading.entity';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';

@Module({
  imports: [TypeOrmModule.forFeature([TelemetryReading]), DevicesModule, AutomationModule, AiModule, CloudBridgeModule],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
