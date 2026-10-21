import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AiService } from './ai.service';

@Module({
  imports: [HttpModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

