import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../entities/group.entity';

@Injectable()
export class GroupsRepository {
	constructor(
		@InjectRepository(Group)
		private readonly repo: Repository<Group>
	) {}

	async findAllByOwner(ownerId: string): Promise<Group[]> {
		return this.repo.find({ where: { ownerId } });
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
