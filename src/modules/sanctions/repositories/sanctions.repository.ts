import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSanction } from '../entities/user-sanction.entity';

@Injectable()
export class SanctionsRepository {
	constructor(
		@InjectRepository(UserSanction)
		private readonly repo: Repository<UserSanction>
	) {}

	async create(data: Partial<UserSanction>): Promise<UserSanction> {
		const sanction = this.repo.create(data);
		return this.repo.save(sanction);
	}

	async findById(id: string): Promise<UserSanction | null> {
		return this.repo.findOne({ where: { id } });
	}

	async findActiveSanctionsForUser(userId: string): Promise<UserSanction[]> {
		return this.repo.find({ where: { userId, active: true }, order: { createdAt: 'DESC' } });
	}

	async findAllActive(limit: number = 50, offset: number = 0): Promise<UserSanction[]> {
		return this.repo.find({
			where: { active: true },
			order: { createdAt: 'DESC' },
			take: limit,
			skip: offset,
		});
	}

	async lift(sanction: UserSanction): Promise<UserSanction> {
		sanction.active = false;
		return this.repo.save(sanction);
	}

	async expireOldSanctions(): Promise<number> {
		const result = await this.repo
			.createQueryBuilder()
			.update(UserSanction)
			.set({ active: false })
			.where('active = true')
			.andWhere('expires_at IS NOT NULL')
			.andWhere('expires_at <= NOW()')
			.execute();
		return result.affected || 0;
	}
}
