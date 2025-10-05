import { ConfigService } from '@nestjs/config';
import { RedisConfig } from './redis.config';

// Mock ioredis
const mockRedisInstance = {
  quit: jest.fn().mockResolvedValue(undefined),
};

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn(() => mockRedisInstance),
  };
});

// Get reference to mocked constructor
const Redis = require('ioredis').default;

describe('RedisConfig', () => {
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as any;

    jest.clearAllMocks();
    (Redis as jest.Mock).mockClear();
    mockRedisInstance.quit.mockClear();
  });

  describe('constructor', () => {
    it('should create Redis client with default configuration', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key: string, defaultValue?: any) => {
          const config = {
            REDIS_HOST: undefined,
            REDIS_PORT: undefined,
            REDIS_PASSWORD: undefined,
            REDIS_DB: undefined,
          };
          return config[key] || defaultValue;
        });

      new RedisConfig(configService);

      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: undefined,
        db: 0,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    });

    it('should create Redis client with custom configuration', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key: string, defaultValue?: any) => {
          const config = {
            REDIS_HOST: 'redis.example.com',
            REDIS_PORT: 6380,
            REDIS_PASSWORD: 'secret123',
            REDIS_DB: 2,
          };
          return config[key] || defaultValue;
        });

      new RedisConfig(configService);

      expect(Redis).toHaveBeenCalledWith({
        host: 'redis.example.com',
        port: 6380,
        password: 'secret123',
        db: 2,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    });
  });

  describe('getClient', () => {
    it('should return Redis client instance', () => {
      const redisConfig = new RedisConfig(configService);
      const client = redisConfig.getClient();
      expect(client).toBeDefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit Redis client on module destroy', async () => {
      const redisConfig = new RedisConfig(configService);
      await redisConfig.onModuleDestroy();
      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });
  });
});
