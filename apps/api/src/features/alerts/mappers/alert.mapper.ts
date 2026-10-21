import { Alert } from '../entities/alert.entity';

export function toAlertResponse(alert: Alert) {
  return {
    id: alert.id,
    deviceId: alert.deviceId,
    severity: alert.severity,
    code: alert.code,
    message: alert.message,
    createdAt: alert.createdAt.toISOString(),
  };
}

