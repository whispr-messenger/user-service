import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBackup } from '../entities/user-backup.entity';

@Injectable()
export class UserBackupRepository {
	constructor(
		@InjectRepository(UserBackup)
		private readonly repo: Repository<UserBackup>
	) {}

	async create(userId: string, data: Record<string, unknown>, sizeBytes: number): Promise<UserBackup> {
		const backup = this.repo.create({ userId, data, sizeBytes });
		return this.repo.save(backup);
	}

	async findLatestForUser(userId: string): Promise<UserBackup | null> {
		return this.repo.findOne({
			where: { userId },
			order: { createdAt: 'DESC' },
		});
	}

	async listByUser(userId: string): Promise<UserBackup[]> {
		return this.repo.find({
			where: { userId },
			order: { createdAt: 'DESC' },
			select: ['id', 'userId', 'sizeBytes', 'createdAt'],
		});
	}

	async findByIdForUser(id: string, userId: string): Promise<UserBackup | null> {
		return this.repo.findOne({ where: { id, userId } });
	}
}
