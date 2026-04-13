import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../entities/group.entity';
import { CursorPaginatedResult } from '../../common/dto/cursor-pagination.dto';
import { applyCursorPagination } from '../../common/utils/cursor-pagination.util';

@Injectable()
export class GroupsRepository {
	constructor(
		@InjectRepository(Group)
		private readonly repo: Repository<Group>
	) {}

	async findAllByOwner(ownerId: string): Promise<Group[]> {
		return this.repo.find({ where: { ownerId } });
	}

	async findAllByOwnerPaginated(
		ownerId: string,
		limit: number = 50,
		cursor?: string
	): Promise<CursorPaginatedResult<Group>> {
		const qb = this.repo.createQueryBuilder('group').where('group.ownerId = :ownerId', { ownerId });

		return applyCursorPagination(qb, { alias: 'group', limit, cursor });
	}

	async findOneById(id: string): Promise<Group | null> {
		return this.repo.findOne({ where: { id } });
	}

	async findOneByOwnerAndId(ownerId: string, id: string): Promise<Group | null> {
		return this.repo.findOne({ where: { ownerId, id } });
	}

	async create(ownerId: string, name: string, description?: string): Promise<Group> {
		const group = this.repo.create({ ownerId, name, description: description ?? null });
		return this.repo.save(group);
	}

	async save(group: Group): Promise<Group> {
		return this.repo.save(group);
	}

	async remove(group: Group): Promise<void> {
		await this.repo.remove(group);
	}
}
