import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { DeviceStatus } from '../../common/enums/device-status.enum';
import { RelayStatus } from '../../common/enums/relay-status.enum';
import { Device } from './entities/device.entity';

interface UpsertTelemetryDeviceInput {
  deviceId: string;
  temperature: number;
  humidity: number;
  relayStatus: RelayStatus;
  observedAt: Date;
}

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly devicesRepository: Repository<Device>,
  ) {}

  async listDevices(): Promise<Device[]> {
    return this.devicesRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async findById(deviceId: string): Promise<Device | null> {
    return this.devicesRepository.findOne({ where: { id: deviceId } });
  }

  async upsertFromTelemetry(input: UpsertTelemetryDeviceInput): Promise<Device> {
    const existing = await this.findById(input.deviceId);
    const device = existing ?? this.devicesRepository.create({ id: input.deviceId, name: input.deviceId });

    device.status = DeviceStatus.Online;
    device.relayStatus = input.relayStatus;
    device.latestTemperature = input.temperature;
    device.latestHumidity = input.humidity;
    device.lastSeenAt = input.observedAt;

    return this.devicesRepository.save(device);
  }

  async updateRelayStatus(deviceId: string, relayStatus: RelayStatus): Promise<Device> {
    const existing = await this.findById(deviceId);
    const device = existing ?? this.devicesRepository.create({ id: deviceId, name: deviceId });

    device.relayStatus = relayStatus;
    device.status = DeviceStatus.Online;
    device.lastSeenAt = new Date();

    return this.devicesRepository.save(device);
  }

  async markStaleDevicesOffline(staleBefore: Date): Promise<number> {
    const result = await this.devicesRepository.update(
      {
        status: DeviceStatus.Online,
        lastSeenAt: LessThan(staleBefore),
      },
      { status: DeviceStatus.Offline },
    );

    return result.affected ?? 0;
  }
}
