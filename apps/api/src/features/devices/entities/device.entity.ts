import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { DeviceStatus } from '../../../common/enums/device-status.enum';
import { RelayStatus } from '../../../common/enums/relay-status.enum';
import { TelemetryReading } from '../../telemetry/entities/telemetry-reading.entity';

@Entity('devices')
export class Device {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.Offline })
  status: DeviceStatus;

  @Column({ type: 'enum', enum: RelayStatus, default: RelayStatus.Off })
  relayStatus: RelayStatus;

  @Column({ type: 'double precision', nullable: true })
  latestTemperature: number | null;

  @Column({ type: 'double precision', nullable: true })
  latestHumidity: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => TelemetryReading, (reading) => reading.device)
  readings: TelemetryReading[];
}

