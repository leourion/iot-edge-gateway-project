import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { TelemetryPayloadDto } from '../telemetry/dto/telemetry-payload.dto';

export function parseTelemetryPayload(buffer: Buffer): TelemetryPayloadDto | null {
  try {
    const raw = JSON.parse(buffer.toString('utf8')) as unknown;
    const payload = plainToInstance(TelemetryPayloadDto, raw);
    const errors = validateSync(payload, { whitelist: true });
    return errors.length > 0 ? null : payload;
  } catch {
    return null;
  }
}

