/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, PrivacySettings, PrivacyLevel } from '../entities';
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

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    })),
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
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockPrivacyRepository.create.mockReturnValue(mockPrivacySettings);
      mockPrivacyRepository.save.mockResolvedValue(mockPrivacySettings);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(2); // Check username and email
      expect(mockUserRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(mockPrivacyRepository.create).toHaveBeenCalled();
      expect(mockPrivacyRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if username already exists', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: createUserDto.username },
      });
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce(mockUser); // email check

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findUserById', () => {
    it('should return a user by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.findOne(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id, isActive: true },
        relations: ['privacySettings'],
      });
    });

    it('should return cached user if available', async () => {
      mockCacheService.get.mockResolvedValue(JSON.stringify(mockUser));

      const result = await service.findOne(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockCacheService.get.mockResolvedValue(null);

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
        where: { username: mockUser.username, isActive: true },
        relations: ['privacySettings'],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findByUsername('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findUserByPhoneNumber', () => {
    it('should return a user by phone number', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByPhoneNumber(mockUser.phoneNumber);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { phoneNumber: mockUser.phoneNumber, isActive: true },
        relations: ['privacySettings'],
      });
    });

    it('should throw NotFoundException if user not found', async () => {
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
      mockUserRepository.save.mockResolvedValue(updatedUser);
      mockCacheService.del.mockResolvedValue(undefined);

      const result = await service.update(mockUser.id, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        ...updateUserDto,
      });
      expect(mockCacheService.del).toHaveBeenCalledWith(`user:${mockUser.id}`);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if username already exists', async () => {
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
      const deactivatedUser = { ...mockUser, isActive: false };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(deactivatedUser);
      mockCacheService.del.mockResolvedValue(undefined);

      await service.deactivate(mockUser.id);

      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        isActive: false,
      });
      expect(mockCacheService.del).toHaveBeenCalledWith(`user:${mockUser.id}`);
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

      mockUserRepository
        .createQueryBuilder()
        .getManyAndCount.mockResolvedValue([users, total]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        users,
        total,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const users = [mockUser];
      const total = 1;

      mockUserRepository
        .createQueryBuilder()
        .getManyAndCount.mockResolvedValue([users, total]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        users,
        total,
        page: 1,
        limit: 10,
      });
    });
  });
});
