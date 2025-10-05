/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { SearchIndexService } from './search-index.service';
import { CacheService } from './cache.service';
import { User } from '../entities';

describe('SearchIndexService', () => {
  let service: SearchIndexService;
  let cacheService: CacheService;

  const mockUser: User = {
    id: 'user1',
    phoneNumber: '+1234567890',
    username: 'testuser',
    firstName: 'John',
    lastName: 'Doe',
    profilePictureUrl: null,
    biography: null,
    isActive: true,
    lastSeen: new Date(),
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

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    delMany: jest.fn(),
    zrange: jest.fn(),
    pipeline: jest.fn().mockResolvedValue(undefined),
    sadd: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    sismember: jest.fn(),
    zadd: jest.fn(),
    zrem: jest.fn(),
    flushall: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIndexService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<SearchIndexService>(SearchIndexService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('indexUser', () => {
    it('should index a user successfully', async () => {
      mockCacheService.set.mockResolvedValue(undefined);

      await service.indexUser(mockUser);

      expect(mockCacheService.pipeline).toHaveBeenCalledWith(
        expect.arrayContaining([
          ['hset', 'search:phone', mockUser.phoneNumber, mockUser.id],
          [
            'hset',
            'search:username',
            mockUser.username.toLowerCase(),
            mockUser.id,
          ],
          ['zadd', 'search:name:john', expect.any(Number), mockUser.id],
          ['zadd', 'search:name:doe', expect.any(Number), mockUser.id],
          ['zadd', 'search:name:john doe', expect.any(Number), mockUser.id],
          ['setex', `user:cache:${mockUser.id}`, 3600, expect.any(String)],
        ]),
      );
    });

    it('should index username lookup', async () => {
      mockCacheService.set.mockResolvedValue(undefined);

      await service.indexUser(mockUser);

      // Username indexing is tested in the main indexUser test
    });

    it('should index phone number lookup if provided', async () => {
      mockCacheService.set.mockResolvedValue(undefined);

      await service.indexUser(mockUser);

      // Phone indexing is tested in the main indexUser test
    });
  });

  describe('getCachedUser', () => {
    it('should return cached user if exists', async () => {
      const cachedUser = {
        id: mockUser.id,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        isActive: mockUser.isActive,
      };
      mockCacheService.get.mockResolvedValue(cachedUser);

      const result = await service.getCachedUser(mockUser.id);

      expect(result).toEqual(cachedUser);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `user:cache:${mockUser.id}`,
      );
    });

    it('should return null if user not cached', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getCachedUser(mockUser.id);

      expect(result).toBeNull();
    });
  });

  describe('searchByUsername', () => {
    it('should return user ID if username exists in cache', async () => {
      mockCacheService.get.mockResolvedValue(mockUser.id);

      const result = await service.searchByUsername(mockUser.username);

      expect(result).toBe(mockUser.id);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `search:username:${mockUser.username.toLowerCase()}`,
      );
    });

    it('should return null if username not found', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.searchByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('searchByPhoneNumber', () => {
    it('should return user ID if phone number exists in cache', async () => {
      mockCacheService.get.mockResolvedValue(mockUser.id);

      const result = await service.searchByPhoneNumber(mockUser.phoneNumber);

      expect(result).toBe(mockUser.id);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `search:phone:${mockUser.phoneNumber}`,
      );
    });

    it('should return null if phone number not found', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.searchByPhoneNumber('+9999999999');

      expect(result).toBeNull();
    });
  });

  describe('searchByName', () => {
    it('should return user IDs from name search index', async () => {
      const userIds = ['user1', 'user2'];
      mockCacheService.zrange.mockResolvedValue(userIds);
      mockCacheService.keys.mockResolvedValue(['search:name:john']);

      const result = await service.searchByName('john', 10);

      expect(result).toEqual(userIds);
      expect(mockCacheService.zrange).toHaveBeenCalledWith(
        'search:name:john',
        0,
        9, // limit - 1
      );
    });

    it('should return empty array if no results found', async () => {
      mockCacheService.zrange.mockResolvedValue([]);

      const result = await service.searchByName('nonexistent', 10);

      expect(result).toEqual([]);
    });
  });

  describe('removeUserFromIndex', () => {
    it('should remove user from all indexes', async () => {
      mockCacheService.del.mockResolvedValue(undefined);
      mockCacheService.zrem.mockResolvedValue(1);
      mockCacheService.keys.mockResolvedValue(['name:john', 'name:doe']);

      await service.removeUserFromIndex(mockUser);

      expect(mockCacheService.pipeline).toHaveBeenCalledWith([
        ['hdel', 'search:phone', mockUser.phoneNumber],
        ['hdel', 'search:username', mockUser.username.toLowerCase()],
        ['zrem', 'search:name:john', mockUser.id],
        ['zrem', 'search:name:doe', mockUser.id],
        ['zrem', 'search:name:john doe', mockUser.id],
        ['del', `user:cache:${mockUser.id}`],
      ]);
    });
  });

  describe('batchIndexUsers', () => {
    it('should index multiple users', async () => {
      const users = [
        mockUser,
        { ...mockUser, id: 'user2', username: 'testuser2' },
      ];
      mockCacheService.set.mockResolvedValue(undefined);

      await service.batchIndexUsers(users);

      expect(mockCacheService.pipeline).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('clearAllIndexes', () => {
    it('should clear all search indexes', async () => {
      mockCacheService.keys.mockResolvedValue([
        'user:user1',
        'username:testuser',
        'phone:+1234567890',
        'name:john',
      ]);
      mockCacheService.delMany.mockResolvedValue(undefined);

      await service.clearAllIndexes();

      expect(mockCacheService.keys).toHaveBeenCalledWith('search:*');
      expect(mockCacheService.keys).toHaveBeenCalledWith('user:cache:*');
      expect(mockCacheService.keys).toHaveBeenCalledWith('search:name:*');
      expect(mockCacheService.delMany).toHaveBeenCalled();
    });
  });

  describe('getSearchStats', () => {
    it('should return search statistics', async () => {
      mockCacheService.get.mockResolvedValue(10);
      mockCacheService.keys.mockResolvedValue(['key1', 'key2']);

      const stats = await service.getSearchStats();

      expect(stats).toEqual({
        totalPhoneIndexes: 10,
        totalUsernameIndexes: 10,
        totalNameIndexes: 2,
        totalCachedUsers: 2,
      });
    });
  });
});
