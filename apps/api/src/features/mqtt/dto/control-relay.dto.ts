import { IsEnum } from 'class-validator';
import { RelayControlCommand } from '../../../common/enums/relay-control-command.enum';

export class ControlRelayDto {
  @IsEnum(RelayControlCommand)
  relayStatus: RelayControlCommand;
}
