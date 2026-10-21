import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AiRiskLevel } from '../../../common/enums/ai-risk-level.enum';
import { AiSuggestedAction } from '../../../common/enums/ai-suggested-action.enum';
import { RelayStatus } from '../../../common/enums/relay-status.enum';
import { Device } from '../../devices/entities/device.entity';

@Entity('telemetry_readings')
export class TelemetryReading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  deviceId: string;

  @ManyToOne(() => Device, (device) => device.readings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  @Column({ type: 'double precision' })
  temperature: number;

  @Column({ type: 'double precision' })
  humidity: number;

  @Column({ type: 'enum', enum: RelayStatus })
  relayStatus: RelayStatus;

  @Column({ type: 'enum', enum: RelayStatus, nullable: true })
  relayActualStatus: RelayStatus | null;

  @Column({ type: 'boolean', default: false })
  waterDetected: boolean;

  @Column({ type: 'timestamptz' })
  observedAt: Date;

  @Column({ type: 'boolean', default: false })
  aiIsAnomaly: boolean;

  @Column({ type: 'enum', enum: AiRiskLevel, default: AiRiskLevel.Unavailable })
  aiRiskLevel: AiRiskLevel;

  @Column({ type: 'double precision', default: 0 })
  aiAnomalyScore: number;

  @Column({ type: 'enum', enum: AiSuggestedAction, default: AiSuggestedAction.None })
  aiSuggestedAction: AiSuggestedAction;

  @Column({ type: 'text', nullable: true })
  aiReason: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  aiModelVersion: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  receivedAt: Date;
}
