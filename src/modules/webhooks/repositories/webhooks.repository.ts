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

	// pagination obligatoire pour eviter full table scan sur tenants avec milliers de webhooks (WHISPR-1382)
	async findAll(opts: { take?: number; skip?: number } = {}): Promise<Webhook[]> {
		const take = Math.min(Math.max(opts.take ?? 50, 1), 200);
		const skip = Math.max(opts.skip ?? 0, 0);
		return this.repo.find({ order: { createdAt: 'DESC' }, take, skip });
	}

	async findById(id: string): Promise<Webhook | null> {
		return this.repo.findOne({ where: { id } });
	}

	// addSelect du secret: usage strict pour signer le payload sortant (WHISPR-1408)
	async findActiveByEvent(event: string): Promise<Webhook[]> {
		return this.repo
			.createQueryBuilder('webhook')
			.addSelect('webhook.secret')
			.where('webhook.active = true')
			.andWhere('webhook.events @> :event', { event: JSON.stringify([event]) })
			.getMany();
	}

	async delete(id: string): Promise<boolean> {
		const result = await this.repo.delete(id);
		return (result.affected || 0) > 0;
	}
}
