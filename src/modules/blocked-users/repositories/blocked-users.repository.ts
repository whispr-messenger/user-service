import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockedUser } from '../entities/blocked-user.entity';
import { CursorPaginatedResult } from '../../common/dto/cursor-pagination.dto';
import { applyCursorPagination } from '../../common/utils/cursor-pagination.util';

@Injectable()
export class BlockedUsersRepository {
	constructor(
		@InjectRepository(BlockedUser)
		private readonly repo: Repository<BlockedUser>
	) {}

	async findAllByBlocker(blockerId: string): Promise<BlockedUser[]> {
		return this.repo.find({ where: { blockerId } });
	}

	async findAllByBlockerPaginated(
		blockerId: string,
		limit: number = 50,
		cursor?: string
	): Promise<CursorPaginatedResult<BlockedUser>> {
		const qb = this.repo
			.createQueryBuilder('blocked')
			.where('blocked.blockerId = :blockerId', { blockerId });

		return applyCursorPagination(qb, { alias: 'blocked', limit, cursor });
	}

	async findOne(blockerId: string, blockedId: string): Promise<BlockedUser | null> {
		return this.repo.findOne({ where: { blockerId, blockedId } });
	}

	async existsEitherDirection(userA: string, userB: string): Promise<boolean> {
		const count = await this.repo
			.createQueryBuilder('blocked')
			.where(
				'(blocked.blockerId = :userA AND blocked.blockedId = :userB) OR (blocked.blockerId = :userB AND blocked.blockedId = :userA)',
				{ userA, userB }
			)
			.limit(1)
			.getCount();
		return count > 0;
	}

	async create(blockerId: string, blockedId: string): Promise<BlockedUser> {
		const blockedUser = this.repo.create({ blockerId, blockedId });
		return this.repo.save(blockedUser);
	}

	async remove(blockedUser: BlockedUser): Promise<void> {
		await this.repo.remove(blockedUser);
	}
}
