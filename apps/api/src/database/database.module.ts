import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from '../features/alerts/entities/alert.entity';
import { Device } from '../features/devices/entities/device.entity';
import { TelemetryReading } from '../features/telemetry/entities/telemetry-reading.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get<string>('DATABASE_USER', 'iot_user'),
        password: config.get<string>('DATABASE_PASSWORD', 'iot_password'),
        database: config.get<string>('DATABASE_NAME', 'iot_monitor'),
        entities: [Device, TelemetryReading, Alert],
        synchronize: config.get<string>('DATABASE_SYNC', 'true') === 'true',
      }),
    }),
  ],
})
export class DatabaseModule {}

