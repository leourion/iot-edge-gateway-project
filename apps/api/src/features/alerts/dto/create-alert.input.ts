import { AlertSeverity } from '../../../common/enums/alert-severity.enum';

export interface CreateAlertInput {
  deviceId: string;
  severity: AlertSeverity;
  code: string;
  message: string;
}

