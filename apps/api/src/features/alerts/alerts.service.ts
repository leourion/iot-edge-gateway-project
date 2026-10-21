import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAlertInput } from './dto/create-alert.input';
import { Alert } from './entities/alert.entity';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertsRepository: Repository<Alert>,
  ) {}

  async createAlert(input: CreateAlertInput): Promise<Alert> {
    const alert = this.alertsRepository.create(input);
    return this.alertsRepository.save(alert);
  }

  async listLatest(limit = 30): Promise<Alert[]> {
    return this.alertsRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

