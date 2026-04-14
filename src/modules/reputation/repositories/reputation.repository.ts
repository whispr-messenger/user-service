import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserReputation } from '../entities/user-reputation.entity';

@Injectable()
export class ReputationRepository {
	constructor(
		@InjectRepository(UserReputation)
		private readonly repo: Repository<UserReputation>
	) {}

	async findByUserId(userId: string): Promise<UserReputation | null> {
		return this.repo.findOne({ where: { userId } });
	}

	async create(data: Partial<UserReputation>): Promise<UserReputation> {
		const reputation = this.repo.create(data);
		return this.repo.save(reputation);
	}

	async save(reputation: UserReputation): Promise<UserReputation> {
		return this.repo.save(reputation);
	}
}
