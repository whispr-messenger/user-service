/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BlockedUsersService } from './blocked-users.service';
import { BlockedUser, User, Contact } from '../entities';
import { BlockUserDto } from '../dto';

describe('BlockedUsersService', () => {
  let service: BlockedUsersService;
  let blockedUserRepository: Repository<BlockedUser>;
  let userRepository: Repository<User>;
  let contactRepository: Repository<Contact>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    phoneNumber: '+1234567890',
    firstName: 'Test',
    lastName: 'User',
    biography: 'Test biography',
    profilePictureUrl: 'https://example.com/avatar.jpg',
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

  const mockBlockedUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    username: 'blockeduser',
    phoneNumber: '+1234567891',
    firstName: 'Blocked',
    lastName: 'User',
    biography: 'Blocked user biography',
    profilePictureUrl: 'https://example.com/blocked.jpg',
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

  const mockBlockedUserEntity: BlockedUser = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    userId: mockUser.id,
    blockedUserId: mockBlockedUser.id,
    reason: 'Harassment',
    blockedAt: new Date(),
    user: mockUser,
    blockedUser: mockBlockedUser,
  };

  const mockContact: Contact = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    userId: mockUser.id,
    contactId: mockBlockedUser.id,
    nickname: 'Former Contact',
    isFavorite: false,
    addedAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
    contactUser: mockBlockedUser,
  };

  const mockBlockedUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockContactRepository = {
    findOne: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockedUsersService,
        {
          provide: getRepositoryToken(BlockedUser),
          useValue: mockBlockedUserRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Contact),
          useValue: mockContactRepository,
        },
      ],
    }).compile();

    service = module.get<BlockedUsersService>(BlockedUsersService);
    blockedUserRepository = module.get<Repository<BlockedUser>>(
      getRepositoryToken(BlockedUser),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    contactRepository = module.get<Repository<Contact>>(
      getRepositoryToken(Contact),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('blockUser', () => {
    it('should block a user successfully', async () => {
      const blockUserDto: BlockUserDto = {
        blockedUserId: mockBlockedUser.id,
        reason: 'Harassment',
      };

      mockUserRepository.findOne.mockResolvedValue(mockBlockedUser);
      mockBlockedUserRepository.findOne.mockResolvedValue(null);
      mockContactRepository.delete.mockResolvedValue({ affected: 0 });
      mockBlockedUserRepository.create.mockReturnValue(mockBlockedUserEntity);
      mockBlockedUserRepository.save.mockResolvedValue(mockBlockedUserEntity);

      const result = await service.blockUser(mockUser.id, blockUserDto);

      expect(result).toEqual(mockBlockedUserEntity);
      expect(mockBlockedUserRepository.save).toHaveBeenCalledWith(
        mockBlockedUserEntity,
      );
    });

    it('should block user and remove contact if exists', async () => {
      const blockUserDto: BlockUserDto = {
        blockedUserId: mockBlockedUser.id,
        reason: 'Harassment',
      };

      mockUserRepository.findOne.mockResolvedValue(mockBlockedUser);
      mockBlockedUserRepository.findOne.mockResolvedValue(null);
      mockContactRepository.delete.mockResolvedValue({ affected: 1 });
      mockBlockedUserRepository.create.mockReturnValue(mockBlockedUserEntity);
      mockBlockedUserRepository.save.mockResolvedValue(mockBlockedUserEntity);

      const result = await service.blockUser(mockUser.id, blockUserDto);

      expect(result).toEqual(mockBlockedUserEntity);
      expect(mockContactRepository.delete).toHaveBeenCalledTimes(2);
      expect(mockBlockedUserRepository.save).toHaveBeenCalledWith(
        mockBlockedUserEntity,
      );
    });

    it('should throw BadRequestException if trying to block self', async () => {
      const blockUserDto: BlockUserDto = {
        blockedUserId: mockUser.id,
        reason: 'Self block',
      };

      await expect(
        service.blockUser(mockUser.id, blockUserDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if blocked user not found', async () => {
      const blockUserDto: BlockUserDto = {
        blockedUserId: 'nonexistent',
        reason: 'Harassment',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.blockUser(mockUser.id, blockUserDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user already blocked', async () => {
      const blockUserDto: BlockUserDto = {
        blockedUserId: mockBlockedUser.id,
        reason: 'Harassment',
      };

      mockUserRepository.findOne.mockResolvedValue(mockBlockedUser);
      mockBlockedUserRepository.findOne.mockResolvedValue(
        mockBlockedUserEntity,
      );

      await expect(
        service.blockUser(mockUser.id, blockUserDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('unblockUser', () => {
    it('should unblock a user successfully', async () => {
      mockBlockedUserRepository.findOne.mockResolvedValue(
        mockBlockedUserEntity,
      );
      mockBlockedUserRepository.remove.mockResolvedValue(mockBlockedUserEntity);

      await service.unblockUser(mockUser.id, mockBlockedUser.id);

      expect(mockBlockedUserRepository.remove).toHaveBeenCalledWith(
        mockBlockedUserEntity,
      );
    });

    it('should throw NotFoundException if blocked user not found', async () => {
      mockBlockedUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.unblockUser(mockUser.id, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBlockedUsers', () => {
    it('should return blocked users', async () => {
      mockBlockedUserRepository.findAndCount.mockResolvedValue([
        [mockBlockedUserEntity],
        1,
      ]);

      const result = await service.getBlockedUsers(mockUser.id);

      expect(result.blockedUsers).toEqual([mockBlockedUserEntity]);
      expect(result.total).toBe(1);
    });
  });

  describe('isUserBlocked', () => {
    it('should return true if user is blocked', async () => {
      mockBlockedUserRepository.findOne.mockResolvedValue(
        mockBlockedUserEntity,
      );

      const result = await service.isUserBlocked(
        mockUser.id,
        mockBlockedUser.id,
      );

      expect(result).toBe(true);
      expect(mockBlockedUserRepository.findOne).toHaveBeenCalledWith({
        where: [
          { userId: mockUser.id, blockedUserId: mockBlockedUser.id },
          { userId: mockBlockedUser.id, blockedUserId: mockUser.id },
        ],
      });
    });

    it('should return false if user is not blocked', async () => {
      mockBlockedUserRepository.findOne.mockResolvedValue(null);

      const result = await service.isUserBlocked(
        mockUser.id,
        mockBlockedUser.id,
      );

      expect(result).toBe(false);
    });
  });

  describe('searchBlockedUsers', () => {
    it('should search blocked users by query', async () => {
      const mockResult = {
        blockedUsers: [mockBlockedUser],
        total: 1,
      };
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockBlockedUser], 1]),
      };
      mockBlockedUserRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.searchBlockedUsers('user1', 'john', 1, 10);

      expect(result).toEqual(mockResult);
      expect(mockBlockedUserRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getBlockedUsersCount', () => {
    it('should return blocked users count', async () => {
      mockBlockedUserRepository.count.mockResolvedValue(3);

      const result = await service.getBlockedUsersCount(mockUser.id);

      expect(result).toBe(3);
      expect(mockBlockedUserRepository.count).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
    });
  });
});
