import { Injectable } from '@nestjs/common';
import { AuditRepository, AuditQueryOptions } from '../repositories/audit.repository';
import { RolesService } from '../../roles/services/roles.service';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditService {
	constructor(
		private readonly auditRepository: AuditRepository,
		private readonly rolesService: RolesService
	) {}

	async log(
		actorId: string,
		action: string,
		targetType: string,
		targetId: string,
		metadata?: Record<string, any>
	): Promise<AuditLog> {
		return this.auditRepository.create({
			actorId,
			action,
			targetType,
			targetId,
			metadata: metadata || {},
		});
	}

	async list(adminId: string, query: AuditQueryOptions): Promise<{ data: AuditLog[]; total: number }> {
		await this.rolesService.ensureAdminOrModerator(adminId);

		const [data, total] = await Promise.all([
			this.auditRepository.findAll(query),
			this.auditRepository.countAll({
				actorId: query.actorId,
				targetType: query.targetType,
				action: query.action,
			}),
		]);

		return { data, total };
	}

	async exportCsv(adminId: string): Promise<string> {
		await this.rolesService.ensureAdminOrModerator(adminId);

		const logs = await this.auditRepository.findAll({ limit: 1000, offset: 0 });

		const header = 'id,actor_id,action,target_type,target_id,metadata,created_at';
		const rows = logs.map(
			(l) =>
				`${l.id},${l.actorId},${l.action},${l.targetType},${l.targetId},"${JSON.stringify(l.metadata).replace(/"/g, '""')}",${l.createdAt.toISOString()}`
		);

		return [header, ...rows].join('\n');
	}
}
