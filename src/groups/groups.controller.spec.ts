import { Test, TestingModule } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, AddGroupMemberDto } from '../dto';
import { Group, GroupMember, GroupRole } from '../entities';

describe('GroupsController', () => {
	let controller: GroupsController;

	const mockGroup: Group = {
		id: 'group-id',
		name: 'Test Group',
		description: 'Test Description',
		pictureUrl: 'http://example.com/pic.jpg',
		createdById: 'creator-id',
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		createdBy: {} as any,
		members: [],
	};

	const mockGroupMember: GroupMember = {
		id: 'member-id',
		groupId: 'group-id',
		userId: 'user-id',
		role: GroupRole.MEMBER,
		isActive: true,
		joinedAt: new Date(),
		updatedAt: new Date(),
		group: {} as any,
		user: {} as any,
	};

	const mockGroupsService = {
		createGroup: jest.fn(),
		findUserGroups: jest.fn(),
		searchGroups: jest.fn(),
		findGroupById: jest.fn(),
		updateGroup: jest.fn(),
		deleteGroup: jest.fn(),
		getGroupMembers: jest.fn(),
		addMember: jest.fn(),
		removeMember: jest.fn(),
		updateMemberRole: jest.fn(),
		leaveGroup: jest.fn(),
		getGroupStats: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [GroupsController],
			providers: [
				{
					provide: GroupsService,
					useValue: mockGroupsService,
				},
			],
		}).compile();

		controller = module.get<GroupsController>(GroupsController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('createGroup', () => {
		it('should create a new group', async () => {
			const dto: CreateGroupDto = { name: 'Test Group' };
			const req = { user: { id: 'user-id' } };
			mockGroupsService.createGroup.mockResolvedValue(mockGroup);

			const result = await controller.createGroup(dto, req);
			expect(result).toEqual(mockGroup);
			expect(mockGroupsService.createGroup).toHaveBeenCalledWith(dto, 'user-id');
		});
	});

	describe('getUserGroups', () => {
		it('should get user groups', async () => {
			const req = { user: { id: 'user-id' } };
			const resultMock = { groups: [mockGroup], total: 1, page: 1, limit: 20 };
			mockGroupsService.findUserGroups.mockResolvedValue(resultMock);

			const result = await controller.getUserGroups(req, 1, 20);
			expect(result).toEqual(resultMock);
			expect(mockGroupsService.findUserGroups).toHaveBeenCalledWith('user-id', 1, 20);
		});
	});

	describe('searchGroups', () => {
		it('should search groups', async () => {
			const req = { user: { id: 'user-id' } };
			const resultMock = { groups: [mockGroup], total: 1, page: 1, limit: 20 };
			mockGroupsService.searchGroups.mockResolvedValue(resultMock);

			const result = await controller.searchGroups(req, 'query', 1, 20);
			expect(result).toEqual(resultMock);
			expect(mockGroupsService.searchGroups).toHaveBeenCalledWith('query', 'user-id', 1, 20);
		});
	});

	describe('getGroupById', () => {
		it('should get group by id', async () => {
			const req = { user: { id: 'user-id' } };
			mockGroupsService.findGroupById.mockResolvedValue(mockGroup);

			const result = await controller.getGroupById('group-id', req);
			expect(result).toEqual(mockGroup);
			expect(mockGroupsService.findGroupById).toHaveBeenCalledWith('group-id', 'user-id');
		});
	});

	describe('updateGroup', () => {
		it('should update group', async () => {
			const dto: UpdateGroupDto = { name: 'Updated Name' };
			const req = { user: { id: 'user-id' } };
			const updatedGroup = { ...mockGroup, name: 'Updated Name' };
			mockGroupsService.updateGroup.mockResolvedValue(updatedGroup);

			const result = await controller.updateGroup('group-id', dto, req);
			expect(result).toEqual(updatedGroup);
			expect(mockGroupsService.updateGroup).toHaveBeenCalledWith('group-id', dto, 'user-id');
		});
	});

	describe('deleteGroup', () => {
		it('should delete group', async () => {
			const req = { user: { id: 'user-id' } };
			mockGroupsService.deleteGroup.mockResolvedValue(undefined);

			await controller.deleteGroup('group-id', req);
			expect(mockGroupsService.deleteGroup).toHaveBeenCalledWith('group-id', 'user-id');
		});
	});

	describe('getGroupMembers', () => {
		it('should get group members', async () => {
			const req = { user: { id: 'user-id' } };
			const resultMock = { members: [mockGroupMember], total: 1, page: 1, limit: 50 };
			mockGroupsService.getGroupMembers.mockResolvedValue(resultMock);

			const result = await controller.getGroupMembers('group-id', req, 1, 50);
			expect(result).toEqual(resultMock);
			expect(mockGroupsService.getGroupMembers).toHaveBeenCalledWith('group-id', 'user-id', 1, 50);
		});
	});

	describe('addMember', () => {
		it('should add member', async () => {
			const dto: AddGroupMemberDto = { userId: 'new-member-id', role: GroupRole.MEMBER };
			const req = { user: { id: 'user-id' } };
			mockGroupsService.addMember.mockResolvedValue(mockGroupMember);

			const result = await controller.addMember('group-id', dto, req);
			expect(result).toEqual(mockGroupMember);
			expect(mockGroupsService.addMember).toHaveBeenCalledWith('group-id', dto, 'user-id');
		});
	});

	describe('removeMember', () => {
		it('should remove member', async () => {
			const req = { user: { id: 'user-id' } };
			mockGroupsService.removeMember.mockResolvedValue(undefined);

			await controller.removeMember('group-id', 'member-id', req);
			expect(mockGroupsService.removeMember).toHaveBeenCalledWith('group-id', 'member-id', 'user-id');
		});
	});

	describe('updateMemberRole', () => {
		it('should update member role', async () => {
			const req = { user: { id: 'user-id' } };
			const updatedMember = { ...mockGroupMember, role: GroupRole.ADMIN };
			mockGroupsService.updateMemberRole.mockResolvedValue(updatedMember);

			const result = await controller.updateMemberRole(
				'group-id',
				'member-id',
				{ role: GroupRole.ADMIN },
				req
			);
			expect(result).toEqual(updatedMember);
			expect(mockGroupsService.updateMemberRole).toHaveBeenCalledWith(
				'group-id',
				'member-id',
				GroupRole.ADMIN,
				'user-id'
			);
		});
	});

	describe('leaveGroup', () => {
		it('should leave group', async () => {
			const req = { user: { id: 'user-id' } };
			mockGroupsService.leaveGroup.mockResolvedValue(undefined);

			await controller.leaveGroup('group-id', req);
			expect(mockGroupsService.leaveGroup).toHaveBeenCalledWith('group-id', 'user-id');
		});
	});

	describe('getGroupStats', () => {
		it('should get group stats', async () => {
			const req = { user: { id: 'user-id' } };
			const stats = {
				memberCount: 10,
				adminCount: 2,
				createdAt: new Date(),
				lastActivity: new Date(),
			};
			mockGroupsService.getGroupStats.mockResolvedValue(stats);

			const result = await controller.getGroupStats('group-id', req);
			expect(result).toEqual(stats);
			expect(mockGroupsService.getGroupStats).toHaveBeenCalledWith('group-id', 'user-id');
		});
	});
});
