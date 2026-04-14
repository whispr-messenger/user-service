import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RolesRepository } from '../repositories/roles.repository';
import { UserRepository } from '../../common/repositories';
import { SetRoleDto } from '../dto/set-role.dto';
import { UserRole } from '../entities/user-role.entity';

@Injectable()
export class RolesService {
	constructor(
		private readonly rolesRepository: RolesRepository,
		private readonly userRepository: UserRepository
	) {}

	async getMyRole(userId: string): Promise<{ role: string }> {
		const userRole = await this.rolesRepository.findByUserId(userId);
		return { role: userRole?.role || 'user' };
	}

	async setRole(targetUserId: string, dto: SetRoleDto, adminId: string): Promise<UserRole> {
		await this.ensureAdmin(adminId);

		const user = await this.userRepository.findById(targetUserId);
		if (!user) {
			throw new NotFoundException('Target user not found');
		}

		return this.rolesRepository.upsert(targetUserId, dto.role, adminId);
	}

	async isAdminOrModerator(userId: string): Promise<boolean> {
		const userRole = await this.rolesRepository.findByUserId(userId);
		return userRole?.role === 'admin' || userRole?.role === 'moderator';
	}

	async ensureAdmin(userId: string): Promise<void> {
		const userRole = await this.rolesRepository.findByUserId(userId);
		if (userRole?.role !== 'admin') {
			throw new ForbiddenException('Admin role required');
		}
	}

	async ensureAdminOrModerator(userId: string): Promise<void> {
		const isAllowed = await this.isAdminOrModerator(userId);
		if (!isAllowed) {
			throw new ForbiddenException('Admin or moderator role required');
		}
	}
}
