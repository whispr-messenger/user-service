import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { GroupsRepository } from '../repositories/groups.repository';
import { GroupMembersRepository } from '../repositories/group-members.repository';
import { UserRepository } from '../../common/repositories';
import { Group } from '../entities/group.entity';
import { GroupMember, GroupRole } from '../entities/group-member.entity';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { AddGroupMemberDto } from '../dto/add-group-member.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';

@Injectable()
export class GroupsService {
	constructor(
		private readonly groupsRepository: GroupsRepository,
		private readonly groupMembersRepository: GroupMembersRepository,
		private readonly userRepository: UserRepository
	) {}

	private async findGroupOrFail(id: string): Promise<Group> {
		const group = await this.groupsRepository.findById(id);
		if (!group) {
			throw new NotFoundException('Group not found');
		}
		return group;
	}

	private async ensureUserExists(userId: string): Promise<void> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
	}

	async createGroup(dto: CreateGroupDto): Promise<Group> {
		await this.ensureUserExists(dto.createdBy);

		const group = await this.groupsRepository.create({
			name: dto.name,
			description: dto.description ?? null,
			photoUrl: dto.photoUrl ?? null,
			createdBy: dto.createdBy,
		});

		// Creator is automatically added as admin
		await this.groupMembersRepository.create({
			groupId: group.id,
			userId: dto.createdBy,
			role: GroupRole.ADMIN,
		});

		return group;
	}

	async getGroup(id: string): Promise<Group> {
		return this.findGroupOrFail(id);
	}

	async updateGroup(id: string, dto: UpdateGroupDto): Promise<Group> {
		const group = await this.findGroupOrFail(id);
		Object.assign(group, dto);
		return this.groupsRepository.save(group);
	}

	async deleteGroup(id: string): Promise<void> {
		const group = await this.findGroupOrFail(id);
		await this.groupsRepository.remove(group);
	}

	async addMember(groupId: string, dto: AddGroupMemberDto): Promise<GroupMember> {
		await this.findGroupOrFail(groupId);
		await this.ensureUserExists(dto.userId);

		const existing = await this.groupMembersRepository.findOne(groupId, dto.userId);
		if (existing) {
			throw new ConflictException('User is already a member of this group');
		}

		return this.groupMembersRepository.create({
			groupId,
			userId: dto.userId,
			role: dto.role ?? GroupRole.MEMBER,
		});
	}

	async removeMember(groupId: string, userId: string): Promise<void> {
		await this.findGroupOrFail(groupId);

		const member = await this.groupMembersRepository.findOne(groupId, userId);
		if (!member) {
			throw new NotFoundException('Member not found in this group');
		}

		await this.groupMembersRepository.remove(member);
	}

	async updateMemberRole(groupId: string, userId: string, dto: UpdateMemberRoleDto): Promise<GroupMember> {
		await this.findGroupOrFail(groupId);

		const member = await this.groupMembersRepository.findOne(groupId, userId);
		if (!member) {
			throw new NotFoundException('Member not found in this group');
		}

		member.role = dto.role;
		return this.groupMembersRepository.save(member);
	}
}
