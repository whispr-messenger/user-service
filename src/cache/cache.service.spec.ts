/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisConfig } from '../config/redis.config';

// Mock Redis
const mockRedis = {
  set: jest.fn(),
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  flushdb: jest.fn(),
  flushall: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  sismember: jest.fn(),
  hset: jest.fn(),
  hget: jest.fn(),
  hgetall: jest.fn(),
  hdel: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  zrem: jest.fn(),
  zscore: jest.fn(),
};

const mockRedisConfig = {
  getClient: jest.fn().mockReturnValue(mockRedis),
};

describe('CacheService', () => {
  let service: CacheService;
  let redisConfig: RedisConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: RedisConfig,
          useValue: mockRedisConfig,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    redisConfig = module.get<RedisConfig>(RedisConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('set', () => {
    it('should set a value without TTL', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      mockRedis.set.mockResolvedValue('OK');

      await service.set(key, value);

      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(value));
    });

    it('should set a value with TTL', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      const ttl = 3600;
      mockRedis.setex.mockResolvedValue('OK');

      await service.set(key, value, ttl);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        ttl,
        JSON.stringify(value),
      );
    });

    it('should handle errors when setting value', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      const error = new Error('Redis error');
      mockRedis.set.mockRejectedValue(error);

      await expect(service.set(key, value)).rejects.toThrow('Redis error');
    });
  });

  describe('get', () => {
    it('should get a value successfully', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(value));

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(mockRedis.get).toHaveBeenCalledWith(key);
    });

    it('should return null for non-existent key', async () => {
      const key = 'test:key';
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      const key = 'test:key';
      mockRedis.get.mockResolvedValue('invalid json');

      const result = await service.get(key);

      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('should delete a single key', async () => {
      const key = 'test:key';
      mockRedis.del.mockResolvedValue(1);

      await service.del(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });
  });

  describe('delMany', () => {
    it('should delete multiple keys', async () => {
      const keys = ['test:key1', 'test:key2'];
      mockRedis.del.mockResolvedValue(2);

      await service.delMany(keys);

      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      const key = 'test:key';
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.exists(key);

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith(key);
    });

    it('should return false if key does not exist', async () => {
      const key = 'test:key';
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.exists(key);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const key = 'test:key';
      mockRedis.exists.mockRejectedValue(new Error('Redis error'));

      const result = await service.exists(key);

      expect(result).toBe(false);
    });
  });

  describe('expire', () => {
    it('should set expiration on key', async () => {
      const key = 'test:key';
      const ttl = 3600;
      mockRedis.expire.mockResolvedValue(1);

      await service.expire(key, ttl);

      expect(mockRedis.expire).toHaveBeenCalledWith(key, ttl);
    });
  });

  describe('keys', () => {
    it('should return matching keys', async () => {
      const pattern = 'test:*';
      const keys = ['test:key1', 'test:key2'];
      mockRedis.keys.mockResolvedValue(keys);

      const result = await service.keys(pattern);

      expect(result).toEqual(keys);
      expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
    });
  });

  describe('flushall', () => {
    it('should flush all keys', async () => {
      mockRedis.flushall.mockResolvedValue('OK');

      await service.flushall();

      expect(mockRedis.flushall).toHaveBeenCalled();
    });
  });

  describe('Set operations', () => {
    describe('sadd', () => {
      it('should add members to set', async () => {
        const key = 'test:set';
        const members = ['member1', 'member2'];
        mockRedis.sadd.mockResolvedValue(2);

        const result = await service.sadd(key, ...members);

        expect(result).toBe(2);
        expect(mockRedis.sadd).toHaveBeenCalledWith(key, ...members);
      });
    });

    describe('srem', () => {
      it('should remove members from set', async () => {
        const key = 'test:set';
        const members = ['member1', 'member2'];
        mockRedis.srem.mockResolvedValue(2);

        const result = await service.srem(key, ...members);

        expect(result).toBe(2);
        expect(mockRedis.srem).toHaveBeenCalledWith(key, ...members);
      });
    });

    describe('smembers', () => {
      it('should get all members of set', async () => {
        const key = 'test:set';
        const members = ['member1', 'member2'];
        mockRedis.smembers.mockResolvedValue(members);

        const result = await service.smembers(key);

        expect(result).toEqual(members);
        expect(mockRedis.smembers).toHaveBeenCalledWith(key);
      });

      it('should return empty array on error', async () => {
        const key = 'test:set';
        mockRedis.smembers.mockRejectedValue(new Error('Redis error'));

        const result = await service.smembers(key);

        expect(result).toEqual([]);
      });
    });

    describe('sismember', () => {
      it('should return true if member exists in set', async () => {
        const key = 'test:set';
        const member = 'member1';
        mockRedis.sismember.mockResolvedValue(1);

        const result = await service.sismember(key, member);

        expect(result).toBe(true);
        expect(mockRedis.sismember).toHaveBeenCalledWith(key, member);
      });

      it('should return false if member does not exist in set', async () => {
        const key = 'test:set';
        const member = 'member1';
        mockRedis.sismember.mockResolvedValue(0);

        const result = await service.sismember(key, member);

        expect(result).toBe(false);
      });

      it('should return false on error', async () => {
        const key = 'test:set';
        const member = 'member1';
        mockRedis.sismember.mockRejectedValue(new Error('Redis error'));

        const result = await service.sismember(key, member);

        expect(result).toBe(false);
      });
    });
  });
});
