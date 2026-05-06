import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SanctionsRepository } from '../repositories/sanctions.repository';
import { UserRepository } from '../../common/repositories';
import { RolesService } from '../../roles/services/roles.service';
import { AuditService } from '../../audit/services/audit.service';
import { CreateSanctionDto } from '../dto/create-sanction.dto';
import { UserSanction } from '../entities/user-sanction.entity';

@Injectable()
export class SanctionsService {
	constructor(
		private readonly sanctionsRepository: SanctionsRepository,
		private readonly userRepository: UserRepository,
		private readonly rolesService: RolesService,
		// WHISPR-1053: admin actions land in audit_logs for the consolidated
		// admin audit feed.
		private readonly auditService: AuditService
	) {}

	async createSanction(dto: CreateSanctionDto, issuedBy: string): Promise<UserSanction> {
		await this.rolesService.ensureAdminOrModerator(issuedBy);

		const user = await this.userRepository.findById(dto.userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}

		const created = await this.sanctionsRepository.create({
			userId: dto.userId,
			type: dto.type,
			reason: dto.reason,
			evidenceRef: dto.evidenceRef || {},
			issuedBy,
			expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
			active: true,
		});

		// WHISPR-1053: consolidated audit trail — admin-issued sanctions
		// show up in GET /admin/audit-logs alongside role changes and appeals.
		await this.auditService.log(issuedBy, 'sanction_issued', 'sanction', created.id, {
			user_id: created.userId,
			type: created.type,
			reason: created.reason,
			expires_at: created.expiresAt?.toISOString() ?? null,
		});

		return created;
	}

	async createAutoSanction(
		userId: string,
		type: 'warning' | 'temp_ban' | 'perm_ban',
		reason: string,
		expiresAt?: Date
	): Promise<UserSanction> {
		return this.sanctionsRepository.create({
			userId,
			type,
			reason,
			evidenceRef: { auto: true },
			issuedBy: 'system',
			expiresAt: expiresAt || null,
			active: true,
		});
	}

	async getMySanctions(userId: string): Promise<UserSanction[]> {
		return this.sanctionsRepository.findActiveSanctionsForUser(userId);
	}

	async listAllActive(adminId: string, limit: number = 50, offset: number = 0): Promise<UserSanction[]> {
		await this.rolesService.ensureAdminOrModerator(adminId);
		return this.sanctionsRepository.findAllActive(limit, offset);
	}

	async getSanction(id: string): Promise<UserSanction> {
		const sanction = await this.sanctionsRepository.findById(id);
		if (!sanction) {
			throw new NotFoundException('Sanction not found');
		}
		return sanction;
	}

	async liftSanction(sanctionId: string, adminId: string): Promise<UserSanction> {
		await this.rolesService.ensureAdminOrModerator(adminId);

		const sanction = await this.getSanction(sanctionId);
		if (!sanction.active) {
			throw new ConflictException('Sanction already lifted');
		}

		const lifted = await this.sanctionsRepository.lift(sanction);

		// WHISPR-1053: audit trail for lift — the caller may be reversing
		// another admin's decision, keep the trail.
		await this.auditService.log(adminId, 'sanction_lifted', 'sanction', lifted.id, {
			user_id: lifted.userId,
			type: lifted.type,
		});

		return lifted;
	}

	// WHISPR-1063: bulk lift — iterate liftSanction in a per-item try/catch
	// so one bad sanction (already lifted, not found) doesn't abort the batch.
	// Role check runs once up-front.
	async bulkLiftSanctions(
		adminId: string,
		sanctionIds: string[]
	): Promise<{
		succeeded: string[];
		failed: Array<{ sanctionId: string; error: string }>;
	}> {
		await this.rolesService.ensureAdminOrModerator(adminId);

		const succeeded: string[] = [];
		const failed: Array<{ sanctionId: string; error: string }> = [];
		for (const sanctionId of sanctionIds) {
			try {
				await this.liftSanction(sanctionId, adminId);
				succeeded.push(sanctionId);
			} catch (err) {
				failed.push({
					sanctionId,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}
		return { succeeded, failed };
	}

	async hasActiveBan(userId: string): Promise<boolean> {
		const sanctions = await this.sanctionsRepository.findActiveSanctionsForUser(userId);
		return sanctions.some((s) => s.type === 'temp_ban' || s.type === 'perm_ban');
	}

	async expireSanctions(): Promise<number> {
		return this.sanctionsRepository.expireOldSanctions();
	}

	async findFiltered(
		adminId: string,
		filters: {
			type?: string;
			userId?: string;
			active?: string;
			dateFrom?: string;
			dateTo?: string;
			limit?: string;
			offset?: string;
		}
	): Promise<UserSanction[]> {
		await this.rolesService.ensureAdminOrModerator(adminId);
		return this.sanctionsRepository.findFiltered({
			type: filters.type,
			userId: filters.userId,
			active: filters.active !== undefined ? filters.active === 'true' : undefined,
			dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
			dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
			limit: filters.limit ? parseInt(filters.limit) : 50,
			offset: filters.offset ? parseInt(filters.offset) : 0,
		});
	}

	async getStats(adminId: string): Promise<{ type: string; count: number }[]> {
		await this.rolesService.ensureAdminOrModerator(adminId);
		return this.sanctionsRepository.getStatsByType();
	}
}
