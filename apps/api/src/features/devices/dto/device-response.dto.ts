import { DeviceStatus } from '../../../common/enums/device-status.enum';
import { RelayStatus } from '../../../common/enums/relay-status.enum';

export interface DeviceResponseDto {
  id: string;
  name: string;
  status: DeviceStatus;
  relayStatus: RelayStatus;
  latestTemperature: number | null;
  latestHumidity: number | null;
  lastSeenAt: string | null;
}

