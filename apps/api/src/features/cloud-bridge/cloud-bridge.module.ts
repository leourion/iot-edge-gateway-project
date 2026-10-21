import { Module } from '@nestjs/common';
import { CloudBridgeService } from './cloud-bridge.service';

@Module({
  providers: [CloudBridgeService],
  exports: [CloudBridgeService],
})
export class CloudBridgeModule {}

