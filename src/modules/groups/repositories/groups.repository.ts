import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../entities/group.entity';
import { CursorPaginatedResult } from '../../common/dto/cursor-pagination.dto';

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
		const qb = this.repo
			.createQueryBuilder('group')
			.where('group.ownerId = :ownerId', { ownerId })
			.orderBy('group.id', 'ASC')
			.take(limit + 1);

		if (cursor) {
			qb.andWhere('group.id > :cursor', { cursor });
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
