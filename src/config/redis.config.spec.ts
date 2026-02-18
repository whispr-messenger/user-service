import { ConfigService } from '@nestjs/config';
import { RedisConfig, buildRedisOptions, parseSentinels } from './redis.config';
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

describe('parseSentinels', () => {
	it('should parse a single sentinel', () => {
		const result = parseSentinels('redis.example.com:26379');
		expect(result).toEqual([{ host: 'redis.example.com', port: 26379 }]);
	});

	it('should parse multiple sentinels', () => {
		const result = parseSentinels('host1:26379,host2:26380,host3:26381');
		expect(result).toEqual([
			{ host: 'host1', port: 26379 },
			{ host: 'host2', port: 26380 },
			{ host: 'host3', port: 26381 },
		]);
	});

	it('should handle whitespace around entries', () => {
		const result = parseSentinels(' host1:26379 , host2:26380 ');
		expect(result).toEqual([
			{ host: 'host1', port: 26379 },
			{ host: 'host2', port: 26380 },
		]);
	});
});

describe('buildRedisOptions', () => {
	let configService: ConfigService;

	beforeEach(() => {
		configService = { get: jest.fn() } as any;
	});

	describe('direct mode', () => {
		it('should return direct options with defaults', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				return defaultValue;
			});

			const options = buildRedisOptions(configService);

			expect(options).toEqual({
				host: 'localhost',
				port: 6379,
				db: 0,
				username: undefined,
				password: undefined,
				maxRetriesPerRequest: 3,
				lazyConnect: true,
			});
		});

		it('should return direct options with custom values', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				const values: Record<string, string> = {
					REDIS_MODE: 'direct',
					REDIS_HOST: 'redis.local',
					REDIS_PORT: '6380',
					REDIS_DB: '2',
					REDIS_USERNAME: 'myuser',
					REDIS_PASSWORD: 'mypass',
				};
				return values[key] ?? defaultValue;
			});

			const options = buildRedisOptions(configService);

			expect(options).toEqual({
				host: 'redis.local',
				port: 6380,
				db: 2,
				username: 'myuser',
				password: 'mypass',
				maxRetriesPerRequest: 3,
				lazyConnect: true,
			});
		});
	});

	describe('sentinel mode', () => {
		it('should return sentinel options when all vars are set', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				const values: Record<string, string> = {
					REDIS_MODE: 'sentinel',
					REDIS_SENTINELS: 'sentinel1:26379,sentinel2:26380',
					REDIS_MASTER_NAME: 'mymaster',
					REDIS_SENTINEL_PASSWORD: 'sentinelpass',
					REDIS_DB: '1',
					REDIS_USERNAME: 'vaultuser',
					REDIS_PASSWORD: 'vaultpass',
				};
				return values[key] ?? defaultValue;
			});

			const options = buildRedisOptions(configService);

			expect(options).toEqual({
				sentinels: [
					{ host: 'sentinel1', port: 26379 },
					{ host: 'sentinel2', port: 26380 },
				],
				name: 'mymaster',
				db: 1,
				username: 'vaultuser',
				password: 'vaultpass',
				sentinelPassword: 'sentinelpass',
				enableReadyCheck: true,
				maxRetriesPerRequest: 3,
			});
		});

		it('should throw when REDIS_SENTINELS is missing', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				const values: Record<string, string> = {
					REDIS_MODE: 'sentinel',
					REDIS_MASTER_NAME: 'mymaster',
					REDIS_SENTINEL_PASSWORD: 'sentinelpass',
				};
				return values[key] ?? defaultValue;
			});

			expect(() => buildRedisOptions(configService)).toThrow(
				'REDIS_SENTINELS is required when REDIS_MODE=sentinel'
			);
		});

		it('should throw when REDIS_MASTER_NAME is missing', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				const values: Record<string, string> = {
					REDIS_MODE: 'sentinel',
					REDIS_SENTINELS: 'host:26379',
					REDIS_SENTINEL_PASSWORD: 'sentinelpass',
				};
				return values[key] ?? defaultValue;
			});

			expect(() => buildRedisOptions(configService)).toThrow(
				'REDIS_MASTER_NAME is required when REDIS_MODE=sentinel'
			);
		});

		it('should throw when REDIS_SENTINEL_PASSWORD is missing', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				const values: Record<string, string> = {
					REDIS_MODE: 'sentinel',
					REDIS_SENTINELS: 'host:26379',
					REDIS_MASTER_NAME: 'mymaster',
				};
				return values[key] ?? defaultValue;
			});

			expect(() => buildRedisOptions(configService)).toThrow(
				'REDIS_SENTINEL_PASSWORD is required when REDIS_MODE=sentinel'
			);
		});
	});
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
		mockRedisInstance.on.mockClear();
	});

	describe('constructor (direct mode)', () => {
		it('should create Redis client with default direct options', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				return defaultValue;
			});

			new RedisConfig(configService);

			expect(Redis).toHaveBeenCalledWith({
				host: 'localhost',
				port: 6379,
				db: 0,
				username: undefined,
				password: undefined,
				maxRetriesPerRequest: 3,
				lazyConnect: true,
			});
		});

		it('should create Redis client with custom direct options', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				const values: Record<string, string> = {
					REDIS_HOST: 'redis.local',
					REDIS_PORT: '6380',
					REDIS_DB: '2',
					REDIS_USERNAME: 'user',
					REDIS_PASSWORD: 'pass',
				};
				return values[key] ?? defaultValue;
			});

			new RedisConfig(configService);

			expect(Redis).toHaveBeenCalledWith({
				host: 'redis.local',
				port: 6380,
				db: 2,
				username: 'user',
				password: 'pass',
				maxRetriesPerRequest: 3,
				lazyConnect: true,
			});
		});

		it('should register error, ready, connect, and close event handlers', () => {
			jest.spyOn(configService, 'get').mockImplementation(
				(_key: string, defaultValue?: any) => defaultValue
			);

			new RedisConfig(configService);

			const onCalls = mockRedisInstance.on.mock.calls.map((c: any[]) => c[0]);
			expect(onCalls).toContain('error');
			expect(onCalls).toContain('ready');
			expect(onCalls).toContain('connect');
			expect(onCalls).toContain('close');
		});
	});

	describe('constructor (sentinel mode)', () => {
		it('should create Redis client with sentinel options', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				const values: Record<string, string> = {
					REDIS_MODE: 'sentinel',
					REDIS_SENTINELS: 'sentinel1:26379,sentinel2:26380',
					REDIS_MASTER_NAME: 'mymaster',
					REDIS_SENTINEL_PASSWORD: 'sentinelpass',
					REDIS_DB: '1',
					REDIS_USERNAME: 'vaultuser',
					REDIS_PASSWORD: 'vaultpass',
				};
				return values[key] ?? defaultValue;
			});

			new RedisConfig(configService);

			expect(Redis).toHaveBeenCalledWith({
				sentinels: [
					{ host: 'sentinel1', port: 26379 },
					{ host: 'sentinel2', port: 26380 },
				],
				name: 'mymaster',
				db: 1,
				username: 'vaultuser',
				password: 'vaultpass',
				sentinelPassword: 'sentinelpass',
				enableReadyCheck: true,
				maxRetriesPerRequest: 3,
			});
		});

		it('should throw when sentinel vars are missing', () => {
			jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
				if (key === 'REDIS_MODE') return 'sentinel';
				return defaultValue;
			});

			expect(() => new RedisConfig(configService)).toThrow(
				'REDIS_SENTINELS is required when REDIS_MODE=sentinel'
			);
		});
	});

	describe('health', () => {
		it('should return health status object', () => {
			jest.spyOn(configService, 'get').mockImplementation(
				(_key: string, defaultValue?: any) => defaultValue
			);

			const redisConfig = new RedisConfig(configService);
			const health = redisConfig.health;

			expect(health).toEqual({ isHealthy: true, lastError: null });
		});
	});

	describe('getClient', () => {
		it('should return Redis client instance', () => {
			jest.spyOn(configService, 'get').mockImplementation(
				(_key: string, defaultValue?: any) => defaultValue
			);

			const redisConfig = new RedisConfig(configService);
			const client = redisConfig.getClient();
			expect(client).toBeDefined();
		});
	});

	describe('onModuleDestroy', () => {
		it('should quit Redis client on module destroy', async () => {
			jest.spyOn(configService, 'get').mockImplementation(
				(_key: string, defaultValue?: any) => defaultValue
			);

			const redisConfig = new RedisConfig(configService);
			await redisConfig.onModuleDestroy();
			expect(mockRedisInstance.quit).toHaveBeenCalled();
		});
	});
});
