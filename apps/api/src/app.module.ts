import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AiModule } from './features/ai/ai.module';
import { AlertsModule } from './features/alerts/alerts.module';
import { AutomationModule } from './features/automation/automation.module';
import { DashboardModule } from './features/dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { DevicesModule } from './features/devices/devices.module';
import { MqttModule } from './features/mqtt/mqtt.module';
import { TelemetryModule } from './features/telemetry/telemetry.module';
import { AuthModule } from './features/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ScheduleModule.forRoot(),
    DatabaseModule,
    AiModule,
    DevicesModule,
    AlertsModule,
    AutomationModule,
    TelemetryModule,
    MqttModule,
    DashboardModule,
  ],
})
export class AppModule {}
