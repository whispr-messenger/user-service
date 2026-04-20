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

	async findPendingQueue(
		limit: number = 50,
		offset: number = 0,
		type?: 'sanction' | 'blocked_image'
	): Promise<Appeal[]> {
		return this.repo.find({
			where: type ? { status: 'pending', type } : { status: 'pending' },
			order: { createdAt: 'ASC' },
			take: limit,
			skip: offset,
		});
	}

	async update(appeal: Appeal): Promise<Appeal> {
		return this.repo.save(appeal);
	}

	async findFiltered(filters: {
		status?: string;
		userId?: string;
		sanctionId?: string;
		type?: string;
		dateFrom?: Date;
		dateTo?: Date;
		limit: number;
		offset: number;
	}): Promise<Appeal[]> {
		const qb = this.repo.createQueryBuilder('a').orderBy('a.createdAt', 'DESC');

		if (filters.status) {
			qb.andWhere('a.status = :status', { status: filters.status });
		}
		if (filters.userId) {
			qb.andWhere('a.userId = :userId', { userId: filters.userId });
		}
		if (filters.sanctionId) {
			qb.andWhere('a.sanctionId = :sanctionId', { sanctionId: filters.sanctionId });
		}
		if (filters.type) {
			qb.andWhere('a.type = :type', { type: filters.type });
		}
		if (filters.dateFrom) {
			qb.andWhere('a.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
		}
		if (filters.dateTo) {
			qb.andWhere('a.createdAt <= :dateTo', { dateTo: filters.dateTo });
		}

		return qb.take(filters.limit).skip(filters.offset).getMany();
	}

	async getStatsByStatus(): Promise<{ status: string; count: number }[]> {
		return this.repo
			.createQueryBuilder('a')
			.select('a.status', 'status')
			.addSelect('COUNT(*)::int', 'count')
			.groupBy('a.status')
			.getRawMany();
	}

	async getTimeline(appealId: string): Promise<Appeal | null> {
		return this.repo.findOne({
			where: { id: appealId },
			relations: ['sanction'],
		});
	}
}
