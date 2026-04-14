import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from '../entities/webhook.entity';

@Injectable()
export class WebhooksRepository {
	constructor(
		@InjectRepository(Webhook)
		private readonly repo: Repository<Webhook>
	) {}

	async create(data: Partial<Webhook>): Promise<Webhook> {
		const webhook = this.repo.create(data);
		return this.repo.save(webhook);
	}

	async findAll(): Promise<Webhook[]> {
		return this.repo.find({ order: { createdAt: 'DESC' } });
	}

	async findById(id: string): Promise<Webhook | null> {
		return this.repo.findOne({ where: { id } });
	}

	async findActiveByEvent(event: string): Promise<Webhook[]> {
		return this.repo
			.createQueryBuilder('webhook')
			.where('webhook.active = true')
			.andWhere('webhook.events @> :event', { event: JSON.stringify([event]) })
			.getMany();
	}

	async delete(id: string): Promise<boolean> {
		const result = await this.repo.delete(id);
		return (result.affected || 0) > 0;
	}
}
