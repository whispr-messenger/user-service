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

	async findById(id: string): Promise<Group | null> {
		return this.repo.findOne({ where: { id } });
	}

	async create(data: Partial<Group>): Promise<Group> {
		const group = this.repo.create(data);
		return this.repo.save(group);
	}

	async save(group: Group): Promise<Group> {
		return this.repo.save(group);
	}

	async remove(group: Group): Promise<void> {
		await this.repo.remove(group);
	}
}
