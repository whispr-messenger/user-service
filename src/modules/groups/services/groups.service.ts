import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../common/repositories';
import { GroupsRepository } from '../repositories/groups.repository';
import { Group } from '../entities/group.entity';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { CursorPaginatedResult } from '../../common/dto/cursor-pagination.dto';

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

	async getGroups(
		ownerId: string,
		limit: number = 50,
		cursor?: string
	): Promise<CursorPaginatedResult<Group>> {
		await this.ensureUserExists(ownerId);
		return this.groupsRepository.findAllByOwnerPaginated(ownerId, limit, cursor);
	}

	async createGroup(ownerId: string, dto: CreateGroupDto): Promise<Group> {
		await this.ensureUserExists(ownerId);
		return this.groupsRepository.create(ownerId, dto.name, dto.description);
	}

	async updateGroup(ownerId: string, groupId: string, dto: UpdateGroupDto): Promise<Group> {
		await this.ensureUserExists(ownerId);

		// Recherche par (ownerId, groupId) afin d'éviter l'énumération de ressources :
		// un groupe inexistant et un groupe possédé par un autre utilisateur renvoient tous les deux 404.
		const group = await this.groupsRepository.findOneByOwnerAndId(ownerId, groupId);
		if (!group) {
			throw new NotFoundException('Group not found');
		}

		Object.assign(group, dto);
		return this.groupsRepository.save(group);
	}

	async deleteGroup(ownerId: string, groupId: string): Promise<void> {
		await this.ensureUserExists(ownerId);

		// Recherche par (ownerId, groupId) afin d'éviter l'énumération de ressources :
		// un groupe inexistant et un groupe possédé par un autre utilisateur renvoient tous les deux 404.
		const group = await this.groupsRepository.findOneByOwnerAndId(ownerId, groupId);
		if (!group) {
			throw new NotFoundException('Group not found');
		}

		await this.groupsRepository.remove(group);
	}
}
