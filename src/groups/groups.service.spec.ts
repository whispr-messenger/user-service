/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { Group, GroupMember, User, GroupRole } from '../entities';
import { CreateGroupDto, UpdateGroupDto, AddGroupMemberDto } from '../dto';

describe('GroupsService', () => {
  let service: GroupsService;
  let groupRepository: Repository<Group>;
  let groupMemberRepository: Repository<GroupMember>;
  let userRepository: Repository<User>;
  let dataSource: DataSource;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    phoneNumber: '+1234567890',
    firstName: 'Test',
    lastName: 'User',
    biography: 'Test biography',
    profilePictureUrl: 'https://avatars.githubusercontent.com/u/92697916?v=4',
    lastSeen: new Date(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    privacySettings: null,
    contacts: [],
    contactedBy: [],
    blockedUsers: [],
    blockedBy: [],
    createdGroups: [],
    groupMemberships: [],
    searchIndex: null,
  };

  const mockGroup: Group = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Group',
    description: 'Test group description',
    pictureUrl: 'https://example.com/group.jpg',
    createdById: mockUser.id,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: mockUser,
    members: [],
  };

  const mockGroupMember: GroupMember = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    groupId: mockGroup.id,
    userId: mockUser.id,
    role: GroupRole.ADMIN,
    isActive: true,
    joinedAt: new Date(),
    updatedAt: new Date(),
    group: mockGroup,
    user: mockUser,
  };

  const mockGroupRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };

  const mockGroupMemberRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: getRepositoryToken(Group),
          useValue: mockGroupRepository,
        },
        {
          provide: getRepositoryToken(GroupMember),
          useValue: mockGroupMemberRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    groupRepository = module.get<Repository<Group>>(getRepositoryToken(Group));
    groupMemberRepository = module.get<Repository<GroupMember>>(
      getRepositoryToken(GroupMember),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    dataSource = module.get<DataSource>(DataSource);

    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createGroup', () => {
    it('should create a new group successfully', async () => {
      const createGroupDto: CreateGroupDto = {
        name: 'Test Group',
        description: 'Test group description',
        pictureUrl: 'https://example.com/group.jpg',
      };
      const userId = mockUser.id;

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockGroupRepository.create.mockReturnValue(mockGroup);
      mockQueryRunner.manager.save.mockResolvedValue(mockGroup);
      mockGroupMemberRepository.create.mockReturnValue(mockGroupMember);

      const result = await service.createGroup(createGroupDto, userId);

      expect(result).toEqual(mockGroup);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      const createGroupDto: CreateGroupDto = {
        name: 'Test Group',
        description: 'Test group description',
      };
      const userId = 'nonexistent-user';

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.createGroup(createGroupDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findGroupById', () => {
    it('should return a group by id', async () => {
      mockGroupRepository.findOne.mockResolvedValue(mockGroup);

      const result = await service.findGroupById(mockGroup.id);

      expect(result).toEqual(mockGroup);
      expect(mockGroupRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockGroup.id },
        relations: ['createdBy', 'members', 'members.user'],
      });
    });

    it('should throw NotFoundException if group not found', async () => {
      mockGroupRepository.findOne.mockResolvedValue(null);

      await expect(service.findGroupById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findUserGroups', () => {
    it('should return groups for a user', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockGroup], 1]),
      };

      mockGroupRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findUserGroups(mockUser.id);

      expect(result.groups).toEqual([mockGroup]);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'member.userId = :userId',
        { userId: mockUser.id },
      );
    });
  });

  describe('updateGroup', () => {
    it('should update a group successfully', async () => {
      const updateGroupDto: UpdateGroupDto = {
        name: 'Updated Group Name',
        description: 'Updated description',
      };
      const updatedGroup = { ...mockGroup, ...updateGroupDto };

      mockGroupRepository.findOne.mockResolvedValue(mockGroup);
      mockGroupRepository.save.mockResolvedValue(updatedGroup);

      const result = await service.updateGroup(
        mockGroup.id,
        updateGroupDto,
        mockUser.id,
      );

      expect(result).toEqual(updatedGroup);
      expect(mockGroupRepository.save).toHaveBeenCalledWith({
        ...mockGroup,
        ...updateGroupDto,
      });
    });

    it('should throw ForbiddenException if user is not group creator', async () => {
      const updateGroupDto: UpdateGroupDto = {
        name: 'Updated Group Name',
      };
      const differentUser = 'different-user-id';

      mockGroupRepository.findOne.mockResolvedValue(mockGroup);

      await expect(
        service.updateGroup(mockGroup.id, updateGroupDto, differentUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addMember', () => {
    it('should add a member to the group successfully', async () => {
      const addMemberDto: AddGroupMemberDto = {
        userId: 'new-user-id',
        role: GroupRole.MEMBER,
      };
      const newUser = { ...mockUser, id: 'new-user-id' };
      const newMember = {
        ...mockGroupMember,
        userId: 'new-user-id',
        role: GroupRole.MEMBER,
      };

      mockGroupRepository.findOne.mockResolvedValue(mockGroup);
      mockUserRepository.findOne.mockResolvedValue(newUser);
      mockGroupMemberRepository.findOne.mockResolvedValue(null);
      mockGroupMemberRepository.create.mockReturnValue(newMember);
      mockGroupMemberRepository.save.mockResolvedValue(newMember);

      const result = await service.addMember(
        mockGroup.id,
        addMemberDto,
        mockUser.id,
      );

      expect(result).toEqual(newMember);
      expect(mockGroupMemberRepository.save).toHaveBeenCalledWith(newMember);
    });

    it('should throw ConflictException if user is already a member', async () => {
      const addMemberDto: AddGroupMemberDto = {
        userId: mockUser.id,
        role: GroupRole.MEMBER,
      };

      mockGroupRepository.findOne.mockResolvedValue(mockGroup);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockGroupMemberRepository.findOne.mockResolvedValue(mockGroupMember);

      await expect(
        service.addMember(mockGroup.id, addMemberDto, mockUser.id),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member from the group successfully', async () => {
      mockGroupRepository.findOne.mockResolvedValue(mockGroup);
      mockGroupMemberRepository.findOne.mockResolvedValue(mockGroupMember);
      mockGroupMemberRepository.remove.mockResolvedValue(mockGroupMember);

      await service.removeMember(mockGroup.id, mockUser.id, mockUser.id);

      expect(mockGroupMemberRepository.remove).toHaveBeenCalledWith(
        mockGroupMember,
      );
    });

    it('should throw NotFoundException if member not found', async () => {
      mockGroupRepository.findOne.mockResolvedValue(mockGroup);
      mockGroupMemberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeMember(mockGroup.id, 'nonexistent-user', mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role successfully', async () => {
      const newRole = GroupRole.MODERATOR;
      const updatedMember = { ...mockGroupMember, role: GroupRole.MODERATOR };

      mockGroupRepository.findOne.mockResolvedValue(mockGroup);
      mockGroupMemberRepository.findOne.mockResolvedValue(mockGroupMember);
      mockGroupMemberRepository.save.mockResolvedValue(updatedMember);

      const result = await service.updateMemberRole(
        mockGroup.id,
        mockUser.id,
        newRole,
        mockUser.id,
      );

      expect(result).toEqual(updatedMember);
      expect(mockGroupMemberRepository.save).toHaveBeenCalledWith({
        ...mockGroupMember,
        role: GroupRole.MODERATOR,
      });
    });
  });

  describe('getGroupMembers', () => {
    it('should return group members', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockGroupMember], 1]),
      };

      mockGroupRepository.findOne.mockResolvedValue(mockGroup);
      mockGroupMemberRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getGroupMembers(mockGroup.id, mockUser.id);

      expect(result.members).toEqual([mockGroupMember]);
      expect(result.total).toBe(1);
    });
  });

  describe('leaveGroup', () => {
    it('should allow user to leave group', async () => {
      mockGroupRepository.findOne.mockResolvedValue(mockGroup);
      mockGroupMemberRepository.findOne.mockResolvedValue(mockGroupMember);
      mockGroupMemberRepository.remove.mockResolvedValue(mockGroupMember);

      await service.leaveGroup(mockGroup.id, mockUser.id);

      expect(mockGroupMemberRepository.remove).toHaveBeenCalledWith(
        mockGroupMember,
      );
    });
  });

  describe('deleteGroup', () => {
    it('should delete a group successfully', async () => {
      const deletedGroup = { ...mockGroup, isActive: false };

      mockGroupRepository.findOne.mockResolvedValue(mockGroup);
      mockGroupRepository.save.mockResolvedValue(deletedGroup);

      await service.deleteGroup(mockGroup.id, mockUser.id);

      expect(mockGroupRepository.save).toHaveBeenCalledWith({
        ...mockGroup,
        isActive: false,
      });
    });

    it('should throw ForbiddenException if user is not group creator', async () => {
      mockGroupRepository.findOne.mockResolvedValue(mockGroup);

      await expect(
        service.deleteGroup(mockGroup.id, 'different-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('searchGroups', () => {
    it('should search groups by name', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockGroup], 1]),
      };

      mockGroupRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchGroups('Test', mockUser.id);

      expect(result.groups).toEqual([mockGroup]);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(group.name) LIKE LOWER(:query)',
        { query: '%Test%' },
      );
    });
  });

  describe('getGroupStats', () => {
    it('should return group statistics', async () => {
      mockGroupMemberRepository.findOne.mockResolvedValue(mockGroupMember);
      mockGroupRepository.findOne.mockResolvedValue(mockGroup);
      mockGroupMemberRepository.count
        .mockResolvedValueOnce(1) // First call for adminCount
        .mockResolvedValueOnce(5); // Second call for memberCount

      const result = await service.getGroupStats(mockGroup.id, mockUser.id);

      expect(result).toEqual({
        memberCount: 5,
        adminCount: 1,
        createdAt: mockGroup.createdAt,
        lastActivity: expect.any(Date),
      });
    });
  });
});
