import { CacheService } from './cache.service';
import { RedisConfig } from '../../config/redis.config';

const mockRedis = {
	get: jest.fn(),
	hget: jest.fn(),
	del: jest.fn(),
	keys: jest.fn(),
	zrange: jest.fn(),
	pipeline: jest.fn(),
};

const mockRedisConfig = {
	getClient: jest.fn().mockReturnValue(mockRedis),
} as unknown as RedisConfig;

describe('CacheService', () => {
	let service: CacheService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new CacheService(mockRedisConfig);
	});

	describe('get', () => {
		it('should return parsed value when key exists', async () => {
			mockRedis.get.mockResolvedValue(JSON.stringify({ id: 1 }));
			const result = await service.get('key');
			expect(result).toEqual({ id: 1 });
		});

		it('should return null when key does not exist', async () => {
			mockRedis.get.mockResolvedValue(null);
			const result = await service.get('key');
			expect(result).toBeNull();
		});

		it('should return null when redis fails', async () => {
			mockRedis.get.mockRejectedValue(new Error('Redis error'));
			const result = await service.get('key');
			expect(result).toBeNull();
		});
	});

	describe('delMany', () => {
		it('should delete multiple keys', async () => {
			mockRedis.del.mockResolvedValue(2);
			await expect(service.delMany(['key1', 'key2'])).resolves.toBeUndefined();
			expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2');
		});

		it('should return early when keys array is empty', async () => {
			await service.delMany([]);
			expect(mockRedis.del).not.toHaveBeenCalled();
		});

		it('should throw when redis fails', async () => {
			mockRedis.del.mockRejectedValue(new Error('Redis error'));
			await expect(service.delMany(['key'])).rejects.toThrow('Redis error');
		});
	});

	describe('keys', () => {
		it('should return matching keys', async () => {
			mockRedis.keys.mockResolvedValue(['user:1', 'user:2']);
			const result = await service.keys('user:*');
			expect(result).toEqual(['user:1', 'user:2']);
		});

		it('should return empty array when redis fails', async () => {
			mockRedis.keys.mockRejectedValue(new Error('Redis error'));
			const result = await service.keys('user:*');
			expect(result).toEqual([]);
		});
	});

	describe('hget', () => {
		it('should return field value from hash', async () => {
			mockRedis.hget.mockResolvedValue('user-1');
			const result = await service.hget('search:phone', '+33600000001');
			expect(result).toBe('user-1');
			expect(mockRedis.hget).toHaveBeenCalledWith('search:phone', '+33600000001');
		});

		it('should return null when redis fails', async () => {
			mockRedis.hget.mockRejectedValue(new Error('Redis error'));
			const result = await service.hget('search:phone', '+33600000001');
			expect(result).toBeNull();
		});
	});

	describe('zrange', () => {
		it('should return range from sorted set', async () => {
			mockRedis.zrange.mockResolvedValue(['a', 'b']);
			const result = await service.zrange('zset', 0, -1);
			expect(result).toEqual(['a', 'b']);
			expect(mockRedis.zrange).toHaveBeenCalledWith('zset', 0, -1);
		});

		it('should return empty array when redis fails', async () => {
			mockRedis.zrange.mockRejectedValue(new Error('Redis error'));
			const result = await service.zrange('zset', 0, -1);
			expect(result).toEqual([]);
		});
	});

	describe('pipeline', () => {
		it('should execute pipeline commands and return results', async () => {
			const mockPipeline = {
				set: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue([
					[null, 'OK'],
					[null, 1],
				]),
			};
			mockRedis.pipeline.mockReturnValue(mockPipeline);

			const result = await service.pipeline([
				['set', 'key1', 'val1'],
				['set', 'key2', 'val2'],
			]);
			expect(result).toEqual(['OK', 1]);
		});

		it('should throw when a pipeline command returns an error', async () => {
			const cmdError = new Error('cmd error');
			const mockPipeline = {
				set: jest.fn().mockReturnThis(),
				exec: jest.fn().mockResolvedValue([[cmdError, null]]),
			};
			mockRedis.pipeline.mockReturnValue(mockPipeline);

			await expect(service.pipeline([['set', 'key', 'val']])).rejects.toThrow('cmd error');
		});

		it('should return empty array when exec returns null', async () => {
			const mockPipeline = {
				exec: jest.fn().mockResolvedValue(null),
			};
			mockRedis.pipeline.mockReturnValue(mockPipeline);

			const result = await service.pipeline([]);
			expect(result).toEqual([]);
		});

		it('should throw when redis pipeline fails', async () => {
			mockRedis.pipeline.mockImplementation(() => {
				throw new Error('Pipeline error');
			});

			await expect(service.pipeline([['set', 'key', 'val']])).rejects.toThrow('Pipeline error');
		});
	});
});
