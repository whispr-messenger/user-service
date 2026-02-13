import { ConfigService } from '@nestjs/config';
import { RedisConfig } from './redis.config';
import Redis from 'ioredis';

// Mock ioredis
const mockRedisInstance = {
	quit: jest.fn().mockResolvedValue(undefined),
	on: jest.fn().mockReturnThis(),
};

jest.mock('ioredis', () => {
	return {
		__esModule: true,
		default: jest.fn(() => mockRedisInstance),
	};
});

describe('RedisConfig', () => {
	let configService: ConfigService;

	beforeEach(() => {
		configService = {
			get: jest.fn(),
		} as any;

		jest.clearAllMocks();
		jest.mocked(Redis).mockClear();
		mockRedisInstance.quit.mockClear();
	});

	describe('constructor', () => {
		it('should create Redis client with default REDIS_URL', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				return defaultValue;
			});

			new RedisConfig(configService);

			expect(Redis).toHaveBeenCalledWith('redis://localhost:6379/0', {
				maxRetriesPerRequest: 3,
				lazyConnect: true,
			});
		});

		it('should create Redis client with custom REDIS_URL', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				if (key === 'REDIS_URL') return 'redis://user:secret123@redis.example.com:6380/2';
				return defaultValue;
			});

			new RedisConfig(configService);

			expect(Redis).toHaveBeenCalledWith('redis://user:secret123@redis.example.com:6380/2', {
				maxRetriesPerRequest: 3,
				lazyConnect: true,
			});
		});

		it('should create Redis client with REDIS_URL without credentials', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				if (key === 'REDIS_URL') return 'redis://redis:6379/0';
				return defaultValue;
			});

			new RedisConfig(configService);

			expect(Redis).toHaveBeenCalledWith('redis://redis:6379/0', {
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
