import { DeviceResponseDto } from '../dto/device-response.dto';
import { Device } from '../entities/device.entity';

export function toDeviceResponse(device: Device): DeviceResponseDto {
  return {
    id: device.id,
    name: device.name,
    status: device.status,
    relayStatus: device.relayStatus,
    latestTemperature: device.latestTemperature,
    latestHumidity: device.latestHumidity,
    lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
  };
}

