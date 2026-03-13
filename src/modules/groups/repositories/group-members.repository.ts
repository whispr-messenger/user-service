import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupMember } from '../entities/group-member.entity';

@Injectable()
export class GroupMembersRepository {
	constructor(
		@InjectRepository(GroupMember)
		private readonly repo: Repository<GroupMember>
	) {}

	async findByGroupId(groupId: string): Promise<GroupMember[]> {
		return this.repo.find({ where: { groupId } });
	}

	async findOne(groupId: string, userId: string): Promise<GroupMember | null> {
		return this.repo.findOne({ where: { groupId, userId } });
	}

	async create(data: Partial<GroupMember>): Promise<GroupMember> {
		const member = this.repo.create(data);
		return this.repo.save(member);
	}

	async save(member: GroupMember): Promise<GroupMember> {
		return this.repo.save(member);
	}

	async remove(member: GroupMember): Promise<void> {
		await this.repo.remove(member);
	}
}
