import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { UserRepository } from '../../common/repositories';
import { GroupsRepository } from '../repositories/groups.repository';
import { Group } from '../entities/group.entity';
import { User } from '../../common/entities/user.entity';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';

const mockUser = (id: string = 'user-uuid-1'): User =>
	({
		id,
		phoneNumber: '+33600000001',
		username: null,
		firstName: null,
		lastName: null,
		biography: null,
		profilePictureUrl: null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	}) as User;

const mockGroup = (overrides: Partial<Group> = {}): Group =>
	({
		id: 'group-uuid-1',
		ownerId: 'user-uuid-1',
		name: 'Test Group',
		description: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}) as Group;

describe('GroupsService', () => {
	let service: GroupsService;
	let userRepository: jest.Mocked<UserRepository>;
	let groupsRepository: jest.Mocked<GroupsRepository>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GroupsService,
				{
					provide: UserRepository,
					useValue: {
						findById: jest.fn(),
					},
				},
				{
					provide: GroupsRepository,
					useValue: {
						findAllByOwnerPaginated: jest.fn(),
						findOneById: jest.fn(),
						findOneByOwnerAndId: jest.fn(),
						create: jest.fn(),
						save: jest.fn(),
						remove: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<GroupsService>(GroupsService);
		userRepository = module.get(UserRepository);
		groupsRepository = module.get(GroupsRepository);
	});

	describe('getGroups', () => {
		it('returns groups for a valid owner', async () => {
			const user = mockUser();
			const groups = [mockGroup()];
			const paginated = { data: groups, nextCursor: null, hasMore: false };
			userRepository.findById.mockResolvedValue(user);
			groupsRepository.findAllByOwnerPaginated.mockResolvedValue(paginated);

			const result = await service.getGroups('user-uuid-1');

			expect(result).toEqual(paginated);
			expect(groupsRepository.findAllByOwnerPaginated).toHaveBeenCalledWith(
				'user-uuid-1',
				50,
				undefined
			);
		});

		it('passes limit and cursor to repository', async () => {
			const user = mockUser();
			const paginated = { data: [], nextCursor: null, hasMore: false };
			userRepository.findById.mockResolvedValue(user);
			groupsRepository.findAllByOwnerPaginated.mockResolvedValue(paginated);

			await service.getGroups('user-uuid-1', 10, 'some-cursor');

			expect(groupsRepository.findAllByOwnerPaginated).toHaveBeenCalledWith(
				'user-uuid-1',
				10,
				'some-cursor'
			);
		});

		it('throws NotFoundException when owner does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.getGroups('user-uuid-1')).rejects.toThrow(NotFoundException);
		});
	});

	describe('createGroup', () => {
		it('creates and returns a new group', async () => {
			const user = mockUser();
			const dto: CreateGroupDto = { name: 'My Group' };
			const group = mockGroup();

			userRepository.findById.mockResolvedValue(user);
			groupsRepository.create.mockResolvedValue(group);

			const result = await service.createGroup('user-uuid-1', dto);

			expect(groupsRepository.create).toHaveBeenCalledWith('user-uuid-1', 'My Group', undefined);
			expect(result).toBe(group);
		});

		it('passes description when provided', async () => {
			const user = mockUser();
			const dto: CreateGroupDto = { name: 'My Group', description: 'A description' };
			const group = mockGroup({ description: 'A description' });

			userRepository.findById.mockResolvedValue(user);
			groupsRepository.create.mockResolvedValue(group);

			const result = await service.createGroup('user-uuid-1', dto);

			expect(groupsRepository.create).toHaveBeenCalledWith('user-uuid-1', 'My Group', 'A description');
			expect(result).toBe(group);
		});

		it('throws NotFoundException when owner does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.createGroup('user-uuid-1', { name: 'My Group' })).rejects.toThrow(
				NotFoundException
			);
		});
	});

	describe('updateGroup', () => {
		it('updates and returns the group', async () => {
			const user = mockUser();
			const group = mockGroup();
			const dto: UpdateGroupDto = { name: 'Updated Name' };
			const saved = { ...group, ...dto } as Group;

			userRepository.findById.mockResolvedValue(user);
			groupsRepository.findOneByOwnerAndId.mockResolvedValue(group);
			groupsRepository.save.mockResolvedValue(saved);

			const result = await service.updateGroup('user-uuid-1', 'group-uuid-1', dto);

			expect(groupsRepository.findOneByOwnerAndId).toHaveBeenCalledWith('user-uuid-1', 'group-uuid-1');
			expect(groupsRepository.save).toHaveBeenCalledWith(expect.objectContaining(dto));
			expect(result).toBe(saved);
		});

		it('throws NotFoundException when owner does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.updateGroup('user-uuid-1', 'group-uuid-1', {})).rejects.toThrow(
				NotFoundException
			);
		});

		it('throws NotFoundException when group does not exist', async () => {
			userRepository.findById.mockResolvedValue(mockUser());
			groupsRepository.findOneByOwnerAndId.mockResolvedValue(null);

			await expect(service.updateGroup('user-uuid-1', 'group-uuid-1', {})).rejects.toThrow(
				NotFoundException
			);
		});

		it('throws NotFoundException when group is owned by another user (no resource enumeration)', async () => {
			userRepository.findById.mockResolvedValue(mockUser('user-uuid-2'));
			// Le groupe existe mais appartient à un autre utilisateur :
			// findOneByOwnerAndId renvoie null pour empêcher l'énumération.
			groupsRepository.findOneByOwnerAndId.mockResolvedValue(null);

			await expect(service.updateGroup('user-uuid-2', 'group-uuid-1', { name: 'x' })).rejects.toThrow(
				NotFoundException
			);
		});
	});

	describe('deleteGroup', () => {
		it('removes the group when it exists and belongs to the owner', async () => {
			const user = mockUser();
			const group = mockGroup();

			userRepository.findById.mockResolvedValue(user);
			groupsRepository.findOneByOwnerAndId.mockResolvedValue(group);

			await service.deleteGroup('user-uuid-1', 'group-uuid-1');

			expect(groupsRepository.findOneByOwnerAndId).toHaveBeenCalledWith('user-uuid-1', 'group-uuid-1');
			expect(groupsRepository.remove).toHaveBeenCalledWith(group);
		});

		it('throws NotFoundException when owner does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.deleteGroup('user-uuid-1', 'group-uuid-1')).rejects.toThrow(
				NotFoundException
			);
		});

		it('throws NotFoundException when group does not exist', async () => {
			userRepository.findById.mockResolvedValue(mockUser());
			groupsRepository.findOneByOwnerAndId.mockResolvedValue(null);

			await expect(service.deleteGroup('user-uuid-1', 'group-uuid-1')).rejects.toThrow(
				NotFoundException
			);
		});

		it('throws NotFoundException when group is owned by another user (no resource enumeration)', async () => {
			userRepository.findById.mockResolvedValue(mockUser('user-uuid-2'));
			// Le groupe existe mais appartient à un autre utilisateur :
			// findOneByOwnerAndId renvoie null pour empêcher l'énumération.
			groupsRepository.findOneByOwnerAndId.mockResolvedValue(null);

			await expect(service.deleteGroup('user-uuid-2', 'group-uuid-1')).rejects.toThrow(
				NotFoundException
			);
		});
	});
});
