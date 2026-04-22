import {
	Injectable,
	Logger,
	NotFoundException,
	ConflictException,
	BadRequestException,
} from '@nestjs/common';
import { AppealsRepository } from '../repositories/appeals.repository';
import { RolesService } from '../../roles/services/roles.service';
import { SanctionsService } from '../../sanctions/services/sanctions.service';
import { RedisConfig } from '../../../config/redis.config';
import { CreateAppealDto, AppealTypeEnum } from '../dto/create-appeal.dto';
import { ReviewAppealDto } from '../dto/review-appeal.dto';
import { Appeal } from '../entities/appeal.entity';

const BLOCKED_IMAGE_APPROVED_CHANNEL = 'whispr:moderation:blocked_image_approved';
const BLOCKED_IMAGE_REJECTED_CHANNEL = 'whispr:moderation:blocked_image_rejected';

@Injectable()
export class AppealsService {
	private readonly logger = new Logger(AppealsService.name);

	constructor(
		private readonly appealsRepository: AppealsRepository,
		private readonly rolesService: RolesService,
		private readonly sanctionsService: SanctionsService,
		private readonly redisConfig: RedisConfig
	) {}

	async createAppeal(dto: CreateAppealDto, userId: string): Promise<Appeal> {
		const type = dto.type ?? AppealTypeEnum.SANCTION;

		if (type === AppealTypeEnum.BLOCKED_IMAGE) {
			// Enforce active-appeal cap across all types
			const userAppeals = await this.appealsRepository.findByUserId(userId);
			const activeAppeals = userAppeals.filter(
				(a) => a.status === 'pending' || a.status === 'under_review'
			);
			if (activeAppeals.length >= 3) {
				throw new BadRequestException('Maximum of 3 active appeals reached');
			}

			return this.appealsRepository.create({
				userId,
				sanctionId: null,
				type: 'blocked_image',
				reason: dto.reason,
				evidence: dto.evidence || {},
				status: 'pending',
			});
		}

		// Default: sanction appeal (legacy behaviour)
		if (!dto.sanctionId) {
			throw new BadRequestException('sanctionId is required for sanction appeals');
		}

		const sanction = await this.sanctionsService.getSanction(dto.sanctionId);
		if (!sanction.active) {
			throw new ConflictException('Sanction is no longer active');
		}

		const userAppeals = await this.appealsRepository.findByUserId(userId);

		const existingAppealForSanction = userAppeals.find(
			(a) => a.sanctionId === dto.sanctionId && (a.status === 'pending' || a.status === 'under_review')
		);
		if (existingAppealForSanction) {
			throw new ConflictException('An appeal already exists for this sanction');
		}

		const activeAppeals = userAppeals.filter(
			(a) => a.status === 'pending' || a.status === 'under_review'
		);
		if (activeAppeals.length >= 3) {
			throw new BadRequestException('Maximum of 3 active appeals reached');
		}

		return this.appealsRepository.create({
			userId,
			sanctionId: dto.sanctionId,
			type: 'sanction',
			reason: dto.reason,
			evidence: dto.evidence || {},
			status: 'pending',
		});
	}

	async getMyAppeals(userId: string): Promise<Appeal[]> {
		return this.appealsRepository.findByUserId(userId);
	}

	async getAppealQueue(
		adminId: string,
		limit: number = 50,
		offset: number = 0,
		type?: 'sanction' | 'blocked_image'
	): Promise<Appeal[]> {
		await this.rolesService.ensureAdminOrModerator(adminId);
		if (type) {
			return this.appealsRepository.findPendingQueue(limit, offset, type);
		}
		return this.appealsRepository.findPendingQueue(limit, offset);
	}

	async getAppeal(id: string): Promise<Appeal> {
		const appeal = await this.appealsRepository.findById(id);
		if (!appeal) {
			throw new NotFoundException('Appeal not found');
		}
		return appeal;
	}

	async reviewAppeal(appealId: string, adminId: string, dto: ReviewAppealDto): Promise<Appeal> {
		await this.rolesService.ensureAdminOrModerator(adminId);

		const appeal = await this.getAppeal(appealId);
		if (appeal.status !== 'pending' && appeal.status !== 'under_review') {
			throw new ConflictException('Appeal has already been resolved');
		}

		appeal.status = dto.status;
		appeal.reviewerId = adminId;
		appeal.reviewerNotes = dto.reviewerNotes || null;
		appeal.resolvedAt = new Date();

		const updated = await this.appealsRepository.update(appeal);

		if (updated.type === 'blocked_image') {
			await this.publishBlockedImageDecision(updated);
		} else if (dto.status === 'accepted' && updated.sanctionId) {
			await this.sanctionsService.liftSanction(updated.sanctionId, adminId);
		}

		return updated;
	}

	// WHISPR-1063: bulk review — process a batch of appeals with the same
	// decision. We call reviewAppeal per-id inside a per-item try/catch so one
	// bad appeal (already resolved, not found, …) doesn't abort the whole
	// batch. The role check runs once up-front to short-circuit a non-admin.
	async bulkReviewAppeals(
		adminId: string,
		appealIds: string[],
		dto: ReviewAppealDto
	): Promise<{
		succeeded: string[];
		failed: Array<{ appealId: string; error: string }>;
	}> {
		await this.rolesService.ensureAdminOrModerator(adminId);

		const succeeded: string[] = [];
		const failed: Array<{ appealId: string; error: string }> = [];
		for (const appealId of appealIds) {
			try {
				await this.reviewAppeal(appealId, adminId, dto);
				succeeded.push(appealId);
			} catch (err) {
				failed.push({
					appealId,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}
		return { succeeded, failed };
	}

	private async publishBlockedImageDecision(appeal: Appeal): Promise<void> {
		const channel =
			appeal.status === 'accepted' ? BLOCKED_IMAGE_APPROVED_CHANNEL : BLOCKED_IMAGE_REJECTED_CHANNEL;

		const payload = {
			appealId: appeal.id,
			userId: appeal.userId,
			conversationId: (appeal.evidence?.conversationId as string | undefined) ?? null,
			messageTempId: (appeal.evidence?.messageTempId as string | undefined) ?? null,
			reviewerNotes: appeal.reviewerNotes,
		};

		try {
			await this.redisConfig.getClient().publish(channel, JSON.stringify(payload));
		} catch (err) {
			this.logger.error(
				`Failed to publish blocked_image decision on ${channel} for appeal ${appeal.id}`,
				err instanceof Error ? err.stack : err
			);
		}
	}

	async findFiltered(
		adminId: string,
		filters: {
			status?: string;
			userId?: string;
			sanctionId?: string;
			type?: string;
			dateFrom?: string;
			dateTo?: string;
			limit?: string;
			offset?: string;
		}
	): Promise<Appeal[]> {
		await this.rolesService.ensureAdminOrModerator(adminId);
		return this.appealsRepository.findFiltered({
			status: filters.status,
			userId: filters.userId,
			sanctionId: filters.sanctionId,
			type: filters.type,
			dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
			dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
			limit: filters.limit ? parseInt(filters.limit) : 50,
			offset: filters.offset ? parseInt(filters.offset) : 0,
		});
	}

	async getStats(adminId: string): Promise<{ status: string; count: number }[]> {
		await this.rolesService.ensureAdminOrModerator(adminId);
		return this.appealsRepository.getStatsByStatus();
	}

	async getTimeline(
		id: string
	): Promise<{ appeal: Appeal; events: Array<{ event: string; timestamp: Date; details?: string }> }> {
		const appeal = await this.appealsRepository.getTimeline(id);
		if (!appeal) {
			throw new NotFoundException('Appeal not found');
		}

		const events: Array<{ event: string; timestamp: Date; details?: string }> = [];
		events.push({ event: 'appeal_created', timestamp: appeal.createdAt, details: appeal.reason });

		if (
			appeal.status === 'under_review' ||
			appeal.status === 'accepted' ||
			appeal.status === 'rejected'
		) {
			events.push({ event: 'under_review', timestamp: appeal.updatedAt });
		}

		if (appeal.resolvedAt) {
			events.push({
				event: `appeal_${appeal.status}`,
				timestamp: appeal.resolvedAt,
				details: appeal.reviewerNotes || undefined,
			});
		}

		return { appeal, events };
	}
}
