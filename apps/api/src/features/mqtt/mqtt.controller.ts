import { Body, Controller, Param, Post } from '@nestjs/common';
import { ControlRelayDto } from './dto/control-relay.dto';
import { MqttService } from './mqtt.service';
import { Roles } from '../auth/roles.decorator';

@Controller('devices/:deviceId/control')
@Roles('admin')
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @Post('relay')
  async controlRelay(@Param('deviceId') deviceId: string, @Body() body: ControlRelayDto) {
    await this.mqttService.publishRelayCommand(deviceId, body.relayStatus);
    return { deviceId, relayStatus: body.relayStatus, queued: true };
  }
}
