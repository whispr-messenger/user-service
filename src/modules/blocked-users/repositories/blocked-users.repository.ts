import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockedUser } from '../entities/blocked-user.entity';

@Injectable()
export class BlockedUsersRepository {
	constructor(
		@InjectRepository(BlockedUser)
		private readonly repo: Repository<BlockedUser>
	) {}

	async findAllByBlocker(blockerId: string): Promise<BlockedUser[]> {
		return this.repo.find({ where: { blockerId } });
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

	async isBlockedEitherWay(userA: string, userB: string): Promise<boolean> {
		const count = await this.repo.count({
			where: [
				{ blockerId: userA, blockedId: userB },
				{ blockerId: userB, blockedId: userA },
			],
		});
		return count > 0;
	}
}
