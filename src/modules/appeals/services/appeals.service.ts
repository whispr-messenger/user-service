import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AppealsRepository } from '../repositories/appeals.repository';
import { RolesService } from '../../roles/services/roles.service';
import { SanctionsService } from '../../sanctions/services/sanctions.service';
import { CreateAppealDto } from '../dto/create-appeal.dto';
import { ReviewAppealDto } from '../dto/review-appeal.dto';
import { Appeal } from '../entities/appeal.entity';

@Injectable()
export class AppealsService {
	constructor(
		private readonly appealsRepository: AppealsRepository,
		private readonly rolesService: RolesService,
		private readonly sanctionsService: SanctionsService
	) {}

	async createAppeal(dto: CreateAppealDto, userId: string): Promise<Appeal> {
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
			reason: dto.reason,
			evidence: dto.evidence || {},
			status: 'pending',
		});
	}

	async getMyAppeals(userId: string): Promise<Appeal[]> {
		return this.appealsRepository.findByUserId(userId);
	}

	async getAppealQueue(adminId: string, limit: number = 50, offset: number = 0): Promise<Appeal[]> {
		await this.rolesService.ensureAdminOrModerator(adminId);
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

		if (dto.status === 'accepted') {
			await this.sanctionsService.liftSanction(appeal.sanctionId, adminId);
		}

		return updated;
	}
}
