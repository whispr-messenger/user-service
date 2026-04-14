import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface AuditQueryOptions {
	limit: number;
	offset: number;
	actorId?: string;
	targetType?: string;
	action?: string;
}

@Injectable()
export class AuditRepository {
	constructor(
		@InjectRepository(AuditLog)
		private readonly repo: Repository<AuditLog>
	) {}

	async create(data: Partial<AuditLog>): Promise<AuditLog> {
		const log = this.repo.create(data);
		return this.repo.save(log);
	}

	async findAll(opts: AuditQueryOptions): Promise<AuditLog[]> {
		const qb = this.repo.createQueryBuilder('audit');

		if (opts.actorId) {
			qb.andWhere('audit.actor_id = :actorId', { actorId: opts.actorId });
		}
		if (opts.targetType) {
			qb.andWhere('audit.target_type = :targetType', { targetType: opts.targetType });
		}
		if (opts.action) {
			qb.andWhere('audit.action = :action', { action: opts.action });
		}

		return qb.orderBy('audit.created_at', 'DESC').take(opts.limit).skip(opts.offset).getMany();
	}

	async countAll(opts: Omit<AuditQueryOptions, 'limit' | 'offset'>): Promise<number> {
		const qb = this.repo.createQueryBuilder('audit');

		if (opts.actorId) {
			qb.andWhere('audit.actor_id = :actorId', { actorId: opts.actorId });
		}
		if (opts.targetType) {
			qb.andWhere('audit.target_type = :targetType', { targetType: opts.targetType });
		}
		if (opts.action) {
			qb.andWhere('audit.action = :action', { action: opts.action });
		}

		return qb.getCount();
	}
}
