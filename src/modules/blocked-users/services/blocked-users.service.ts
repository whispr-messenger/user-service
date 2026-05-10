import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UserRepository } from '../../common/repositories';
import { BlockedUsersRepository } from '../repositories/blocked-users.repository';
import { BlockedUser } from '../entities/blocked-user.entity';
import { BlockUserDto } from '../dto/block-user.dto';
import { CursorPaginatedResult } from '../../common/dto/cursor-pagination.dto';

@Injectable()
export class BlockedUsersService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly blockedUsersRepository: BlockedUsersRepository
	) {}

	private async ensureUserExists(userId: string): Promise<void> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
	}

	async getBlockedUsers(
		blockerId: string,
		limit: number = 50,
		cursor?: string
	): Promise<CursorPaginatedResult<BlockedUser>> {
		await this.ensureUserExists(blockerId);
		return this.blockedUsersRepository.findAllByBlockerPaginated(blockerId, limit, cursor);
	}

	async blockUser(blockerId: string, dto: BlockUserDto): Promise<BlockedUser> {
		if (blockerId === dto.blockedId) {
			throw new BadRequestException('Cannot block yourself');
		}

		await this.ensureUserExists(blockerId);
		await this.ensureUserExists(dto.blockedId);

		const existing = await this.blockedUsersRepository.findOne(blockerId, dto.blockedId);
		if (existing) {
			throw new ConflictException('User is already blocked');
		}

		return this.blockedUsersRepository.create(blockerId, dto.blockedId);
	}

	async isBlockedEitherWay(userA: string, userB: string): Promise<boolean> {
		return this.blockedUsersRepository.existsEitherDirection(userA, userB);
	}

	async unblockUser(blockerId: string, blockedId: string): Promise<void> {
		await this.ensureUserExists(blockerId);

		const blockedUser = await this.blockedUsersRepository.findOne(blockerId, blockedId);
		if (!blockedUser) {
			throw new NotFoundException('Blocked user not found');
		}

		await this.blockedUsersRepository.remove(blockedUser);
	}
}
