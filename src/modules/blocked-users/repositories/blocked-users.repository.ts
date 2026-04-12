import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockedUser } from '../entities/blocked-user.entity';
import { CursorPaginatedResult } from '../../common/dto/cursor-pagination.dto';

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
			.where('blocked.blockerId = :blockerId', { blockerId })
			.orderBy('blocked.id', 'ASC')
			.take(limit + 1);

		if (cursor) {
			qb.andWhere('blocked.id > :cursor', { cursor });
		}

		const results = await qb.getMany();
		const hasMore = results.length > limit;
		const data = hasMore ? results.slice(0, limit) : results;

		return {
			data,
			nextCursor: hasMore ? data[data.length - 1].id : null,
			hasMore,
		};
	}

	async findOne(blockerId: string, blockedId: string): Promise<BlockedUser | null> {
		return this.repo.findOne({ where: { blockerId, blockedId } });
	}

	async create(blockerId: string, blockedId: string): Promise<BlockedUser> {
		const blockedUser = this.repo.create({ blockerId, blockedId });
		return this.repo.save(blockedUser);
	}

	async remove(blockedUser: BlockedUser): Promise<void> {
		await this.repo.remove(blockedUser);
	}
}
