/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import {
  UserSearchService,
  UserSearchResult,
  SearchOptions,
} from './user-search.service';
import { User, PrivacySettings, PrivacyLevel } from '../entities';
import { SearchIndexService } from '../cache';
import { PrivacyService } from '../privacy/privacy.service';

describe('UserSearchService', () => {
  let service: UserSearchService;
  let userRepository: Repository<User>;
  let privacySettingsRepository: Repository<PrivacySettings>;
  let searchIndexService: SearchIndexService;
  let privacyService: PrivacyService;

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

  const mockPrivacySettings: PrivacySettings = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    userId: mockUser.id,
    profilePicturePrivacy: PrivacyLevel.EVERYONE,
    firstNamePrivacy: PrivacyLevel.EVERYONE,
    lastNamePrivacy: PrivacyLevel.CONTACTS,
    biographyPrivacy: PrivacyLevel.EVERYONE,
    lastSeenPrivacy: PrivacyLevel.EVERYONE,
    searchByPhone: true,
    searchByUsername: true,
    readReceipts: true,
    updatedAt: new Date(),
    user: mockUser,
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPrivacySettingsRepository = {
    findOne: jest.fn(),
  };

  const mockSearchIndexService = {
    searchByPhoneNumber: jest.fn(),
    searchByUsername: jest.fn(),
    searchByName: jest.fn(),
    getCachedUser: jest.fn(),
    indexUser: jest.fn(),
    addToIndex: jest.fn(),
    removeFromIndex: jest.fn(),
    updateIndex: jest.fn(),
    rebuildIndexes: jest.fn(),
    clearAllIndexes: jest.fn(),
    batchIndexUsers: jest.fn(),
  };

  const mockPrivacyService = {
    filterUserData: jest.fn(),
    canSearchByPhone: jest.fn(),
    canSearchByUsername: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSearchService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(PrivacySettings),
          useValue: mockPrivacySettingsRepository,
        },
        {
          provide: SearchIndexService,
          useValue: mockSearchIndexService,
        },
        {
          provide: PrivacyService,
          useValue: mockPrivacyService,
        },
      ],
    }).compile();

    service = module.get<UserSearchService>(UserSearchService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    privacySettingsRepository = module.get<Repository<PrivacySettings>>(
      getRepositoryToken(PrivacySettings),
    );
    searchIndexService = module.get<SearchIndexService>(SearchIndexService);
    privacyService = module.get<PrivacyService>(PrivacyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchByPhoneNumber', () => {
    it('should search user by phone number', async () => {
      const phoneNumber = '+1234567890';
      const searcherId = 'searcher-id';
      const userSearchResult = {
        id: mockUser.id,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        profilePictureUrl: mockUser.profilePictureUrl,
        isActive: mockUser.isActive,
        canViewProfile: true,
        canViewPhoneNumber: true,
        canViewFirstName: true,
        canViewLastName: true,
      };

      mockSearchIndexService.searchByPhoneNumber.mockResolvedValue(mockUser.id);
      mockSearchIndexService.getCachedUser.mockResolvedValue(mockUser);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest
        .spyOn(service as any, 'formatUserSearchResult')
        .mockResolvedValue(userSearchResult);

      const result = await service.searchByPhoneNumber(phoneNumber, {
        viewerId: searcherId,
      });

      expect(result).toEqual(userSearchResult);
      expect(mockSearchIndexService.searchByPhoneNumber).toHaveBeenCalledWith(
        phoneNumber,
      );
    });

    it('should return null when no user found', async () => {
      mockSearchIndexService.searchByPhoneNumber.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.searchByPhoneNumber('+9999999999', {
        viewerId: 'searcher-id',
      });

      expect(result).toBeNull();
    });
  });

  describe('searchByUsername', () => {
    it('should search user by username', async () => {
      const username = 'testuser';
      const searcherId = 'searcher-id';
      const userSearchResult = {
        id: mockUser.id,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        profilePictureUrl: mockUser.profilePictureUrl,
        isActive: mockUser.isActive,
        canViewProfile: true,
        canViewPhoneNumber: true,
        canViewFirstName: true,
        canViewLastName: true,
      };

      mockSearchIndexService.searchByUsername.mockResolvedValue(mockUser.id);
      mockSearchIndexService.getCachedUser.mockResolvedValue(mockUser);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest
        .spyOn(service as any, 'formatUserSearchResult')
        .mockResolvedValue(userSearchResult);

      const result = await service.searchByUsername(username, {
        viewerId: searcherId,
      });

      expect(result).toEqual(userSearchResult);
    });
  });

  describe('searchByName', () => {
    it('should search users by name', async () => {
      const name = 'Test User';
      const searcherId = 'searcher-id';
      const userSearchResult = {
        id: mockUser.id,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        profilePictureUrl: mockUser.profilePictureUrl,
        isActive: mockUser.isActive,
        canViewProfile: true,
        canViewPhoneNumber: true,
        canViewFirstName: true,
        canViewLastName: true,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      mockSearchIndexService.searchByName.mockResolvedValue([]);
      mockUserRepository.find.mockResolvedValue([]);
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      jest
        .spyOn(service as any, 'formatUserSearchResult')
        .mockResolvedValue(userSearchResult);

      const result = await service.searchByName(name, { viewerId: searcherId });

      expect(result).toEqual([userSearchResult]);
    });
  });

  describe('advancedSearch', () => {
    it('should perform advanced search with multiple criteria', async () => {
      const criteria = {
        phoneNumber: '+1234567890',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };
      const searcherId = 'searcher-id';
      const userSearchResult = {
        id: mockUser.id,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        profilePictureUrl: mockUser.profilePictureUrl,
        isActive: mockUser.isActive,
        canViewProfile: true,
        canViewPhoneNumber: true,
        canViewFirstName: true,
        canViewLastName: true,
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      jest
        .spyOn(service as any, 'formatUserSearchResult')
        .mockResolvedValue(userSearchResult);

      const result = await service.advancedSearch(criteria, {
        viewerId: searcherId,
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual([userSearchResult]);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return search suggestions', async () => {
      const query = 'test';
      const searcherId = 'searcher-id';
      const suggestions = ['testuser', 'testuser2'];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      mockSearchIndexService.searchByUsername.mockResolvedValue([mockUser.id]);
      mockSearchIndexService.searchByName.mockResolvedValue([mockUser.id]);
      mockUserRepository.find.mockResolvedValue([mockUser]);
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getSearchSuggestions(query, {
        viewerId: searcherId,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('rebuildSearchIndexes', () => {
    it('should rebuild search indexes', async () => {
      mockSearchIndexService.clearAllIndexes.mockResolvedValue(undefined);
      mockSearchIndexService.batchIndexUsers.mockResolvedValue(undefined);
      mockUserRepository.find.mockResolvedValue([mockUser]);

      await service.rebuildSearchIndexes();

      expect(mockSearchIndexService.clearAllIndexes).toHaveBeenCalled();
      expect(mockSearchIndexService.batchIndexUsers).toHaveBeenCalledWith([
        mockUser,
      ]);
    });
  });
});
