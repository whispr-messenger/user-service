import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRepository } from '../../common/repositories';
import { GroupsRepository } from '../repositories/groups.repository';
import { Group } from '../entities/group.entity';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';

@Injectable()
export class GroupsService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly groupsRepository: GroupsRepository
	) {}

	private async ensureUserExists(userId: string): Promise<void> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
	}

	async getGroups(ownerId: string): Promise<Group[]> {
		await this.ensureUserExists(ownerId);
		return this.groupsRepository.findAllByOwner(ownerId);
	}

	async createGroup(ownerId: string, dto: CreateGroupDto): Promise<Group> {
		await this.ensureUserExists(ownerId);
		return this.groupsRepository.create(ownerId, dto.name, dto.description);
	}

	async updateGroup(ownerId: string, groupId: string, dto: UpdateGroupDto): Promise<Group> {
		await this.ensureUserExists(ownerId);

		const group = await this.groupsRepository.findOneById(groupId);
		if (!group) {
			throw new NotFoundException('Group not found');
		}

		if (group.ownerId !== ownerId) {
			throw new ForbiddenException('You do not own this group');
		}

		Object.assign(group, dto);
		return this.groupsRepository.save(group);
	}

	async deleteGroup(ownerId: string, groupId: string): Promise<void> {
		await this.ensureUserExists(ownerId);

		const group = await this.groupsRepository.findOneById(groupId);
		if (!group) {
			throw new NotFoundException('Group not found');
		}

		if (group.ownerId !== ownerId) {
			throw new ForbiddenException('You do not own this group');
		}

		await this.groupsRepository.remove(group);
	}
}
