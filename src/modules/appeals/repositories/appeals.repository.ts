import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appeal } from '../entities/appeal.entity';

@Injectable()
export class AppealsRepository {
	constructor(
		@InjectRepository(Appeal)
		private readonly repo: Repository<Appeal>
	) {}

	async create(data: Partial<Appeal>): Promise<Appeal> {
		const appeal = this.repo.create(data);
		return this.repo.save(appeal);
	}

	async findById(id: string): Promise<Appeal | null> {
		return this.repo.findOne({ where: { id } });
	}

	async findByUserId(userId: string): Promise<Appeal[]> {
		return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
	}

	async findPendingQueue(limit: number = 50, offset: number = 0): Promise<Appeal[]> {
		return this.repo.find({
			where: { status: 'pending' },
			order: { createdAt: 'ASC' },
			take: limit,
			skip: offset,
		});
	}

	async update(appeal: Appeal): Promise<Appeal> {
		return this.repo.save(appeal);
	}
}
