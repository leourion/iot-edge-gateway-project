import { Controller, Get, Param } from '@nestjs/common';
import { toDeviceResponse } from './mappers/device.mapper';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async listDevices() {
    const devices = await this.devicesService.listDevices();
    return devices.map(toDeviceResponse);
  }

  @Get(':deviceId')
  async getDevice(@Param('deviceId') deviceId: string) {
    const device = await this.devicesService.findById(deviceId);
    return device ? toDeviceResponse(device) : null;
  }
}

