/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  User,
  PrivacySettings,
  PrivacyLevel,
  UserSearchIndex,
} from '../entities';
import { CreateUserDto, UpdateUserDto } from '../dto';
import { CacheService } from '../cache';

describe('UsersService', () => {
  let service: UsersService;
  let _userRepository: Repository<User>;
  let _privacyRepository: Repository<PrivacySettings>;
  let _cacheService: CacheService;

  const mockUser: Partial<User> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    phoneNumber: '+1234567890',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrivacySettings: Partial<PrivacySettings> = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    userId: mockUser.id,
    profilePicturePrivacy: PrivacyLevel.EVERYONE,
    firstNamePrivacy: PrivacyLevel.EVERYONE,
    lastNamePrivacy: PrivacyLevel.CONTACTS,
    biographyPrivacy: PrivacyLevel.EVERYONE,
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
      findOne: jest.fn(),
    },
  };

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    })),
    manager: {
      connection: {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      },
    },
  };

  const mockPrivacyRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCacheService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  };

  const mockUserSearchIndexRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(PrivacySettings),
          useValue: mockPrivacyRepository,
        },
        {
          provide: getRepositoryToken(UserSearchIndex),
          useValue: mockUserSearchIndexRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    _userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    _privacyRepository = module.get<Repository<PrivacySettings>>(
      getRepositoryToken(PrivacySettings),
    );
    _cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      username: 'testuser',
      phoneNumber: '+1234567890',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should create a user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);
      mockPrivacyRepository.create.mockReturnValue(mockPrivacySettings);
      mockUserSearchIndexRepository.create.mockReturnValue({});

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(2); // Check phoneNumber and username
      expect(mockUserRepository.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw ConflictException if phoneNumber already exists', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { phoneNumber: createUserDto.phoneNumber },
      });
    });

    it('should throw ConflictException if username already exists', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // phoneNumber check
        .mockResolvedValueOnce(mockUser); // username check

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findUserById', () => {
    it('should return a user by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        relations: ['privacySettings'],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findUserByUsername', () => {
    it('should return a user by username', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByUsername(mockUser.username);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: mockUser.username },
        relations: ['privacySettings'],
      });
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findByUsername('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findUserByPhoneNumber', () => {
    it('should return a user by phone number', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByPhoneNumber(mockUser.phoneNumber);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { phoneNumber: mockUser.phoneNumber },
        relations: ['privacySettings'],
      });
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findByPhoneNumber('+9999999999');
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update a user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(updatedUser);
      mockQueryRunner.manager.findOne.mockResolvedValue({
        userId: mockUser.id,
      });

      const result = await service.update(mockUser.id, updateUserDto);

      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if username already exists', async () => {
      const updateWithUsername = { ...updateUserDto, username: 'existinguser' };
      const existingUser = { ...mockUser, id: 'different-id' };

      mockUserRepository.findOne
        .mockResolvedValueOnce(mockUser) // findUserById
        .mockResolvedValueOnce(existingUser); // username check

      await expect(
        service.update(mockUser.id, updateWithUsername),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate a user successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.deactivate(mockUser.id);

      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, {
        isActive: false,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.deactivate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findUsers', () => {
    it('should return paginated users', async () => {
      const users = [mockUser];
      const total = 1;

      mockUserRepository.findAndCount.mockResolvedValue([users, total]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        users,
        total,
      });
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const users = [mockUser];
      const total = 1;

      mockUserRepository.findAndCount.mockResolvedValue([users, total]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        users,
        total,
      });
    });
  });
});
