import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../entities/user-role.entity';

@Injectable()
export class RolesRepository {
	constructor(
		@InjectRepository(UserRole)
		private readonly repo: Repository<UserRole>
	) {}

	async findByUserId(userId: string): Promise<UserRole | null> {
		return this.repo.findOne({ where: { userId } });
	}

	async upsert(userId: string, role: string, grantedBy: string): Promise<UserRole> {
		const existing = await this.findByUserId(userId);
		if (existing) {
			existing.role = role as UserRole['role'];
			existing.grantedBy = grantedBy;
			return this.repo.save(existing);
		}
		const userRole = this.repo.create({
			userId,
			role: role as UserRole['role'],
			grantedBy,
		});
		return this.repo.save(userRole);
	}
}
