import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SanctionsRepository } from '../repositories/sanctions.repository';
import { UserRepository } from '../../common/repositories';
import { RolesService } from '../../roles/services/roles.service';
import { CreateSanctionDto } from '../dto/create-sanction.dto';
import { UserSanction } from '../entities/user-sanction.entity';

@Injectable()
export class SanctionsService {
	constructor(
		private readonly sanctionsRepository: SanctionsRepository,
		private readonly userRepository: UserRepository,
		private readonly rolesService: RolesService
	) {}

	async createSanction(dto: CreateSanctionDto, issuedBy: string): Promise<UserSanction> {
		await this.rolesService.ensureAdminOrModerator(issuedBy);

		const user = await this.userRepository.findById(dto.userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}

		return this.sanctionsRepository.create({
			userId: dto.userId,
			type: dto.type,
			reason: dto.reason,
			evidenceRef: dto.evidenceRef || {},
			issuedBy,
			expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
			active: true,
		});
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

		return this.sanctionsRepository.lift(sanction);
	}

	async hasActiveBan(userId: string): Promise<boolean> {
		const sanctions = await this.sanctionsRepository.findActiveSanctionsForUser(userId);
		return sanctions.some((s) => s.type === 'temp_ban' || s.type === 'perm_ban');
	}

	async expireSanctions(): Promise<number> {
		return this.sanctionsRepository.expireOldSanctions();
	}
}
