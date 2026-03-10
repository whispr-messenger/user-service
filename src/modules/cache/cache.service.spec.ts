import { CacheService } from './cache.service';
import { RedisConfig } from '../../config/redis.config';

const mockRedis = {
	set: jest.fn(),
	setex: jest.fn(),
	get: jest.fn(),
	del: jest.fn(),
	exists: jest.fn(),
	expire: jest.fn(),
	keys: jest.fn(),
	sadd: jest.fn(),
	srem: jest.fn(),
	smembers: jest.fn(),
	sismember: jest.fn(),
	zadd: jest.fn(),
	zrange: jest.fn(),
	zrem: jest.fn(),
	incr: jest.fn(),
	decr: jest.fn(),
	pipeline: jest.fn(),
	flushall: jest.fn(),
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

	describe('set', () => {
		it('should call setex when ttl is provided', async () => {
			mockRedis.setex.mockResolvedValue('OK');
			await service.set('key', { foo: 'bar' }, 60);
			expect(mockRedis.setex).toHaveBeenCalledWith('key', 60, JSON.stringify({ foo: 'bar' }));
		});

		it('should call set when no ttl is provided', async () => {
			mockRedis.set.mockResolvedValue('OK');
			await service.set('key', 'value');
			expect(mockRedis.set).toHaveBeenCalledWith('key', JSON.stringify('value'));
		});

		it('should throw when redis.set fails', async () => {
			mockRedis.set.mockRejectedValue(new Error('Redis error'));
			await expect(service.set('key', 'value')).rejects.toThrow('Redis error');
		});

		it('should throw when redis.setex fails', async () => {
			mockRedis.setex.mockRejectedValue(new Error('Redis error'));
			await expect(service.set('key', 'value', 30)).rejects.toThrow('Redis error');
		});
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

	describe('del', () => {
		it('should delete a key', async () => {
			mockRedis.del.mockResolvedValue(1);
			await expect(service.del('key')).resolves.toBeUndefined();
			expect(mockRedis.del).toHaveBeenCalledWith('key');
		});

		it('should throw when redis fails', async () => {
			mockRedis.del.mockRejectedValue(new Error('Redis error'));
			await expect(service.del('key')).rejects.toThrow('Redis error');
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

	describe('exists', () => {
		it('should return true when key exists', async () => {
			mockRedis.exists.mockResolvedValue(1);
			expect(await service.exists('key')).toBe(true);
		});

		it('should return false when key does not exist', async () => {
			mockRedis.exists.mockResolvedValue(0);
			expect(await service.exists('key')).toBe(false);
		});

		it('should return false when redis fails', async () => {
			mockRedis.exists.mockRejectedValue(new Error('Redis error'));
			expect(await service.exists('key')).toBe(false);
		});
	});

	describe('expire', () => {
		it('should set TTL on a key', async () => {
			mockRedis.expire.mockResolvedValue(1);
			await expect(service.expire('key', 120)).resolves.toBeUndefined();
			expect(mockRedis.expire).toHaveBeenCalledWith('key', 120);
		});

		it('should throw when redis fails', async () => {
			mockRedis.expire.mockRejectedValue(new Error('Redis error'));
			await expect(service.expire('key', 120)).rejects.toThrow('Redis error');
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

	describe('sadd', () => {
		it('should add members to a set and return count', async () => {
			mockRedis.sadd.mockResolvedValue(2);
			const result = await service.sadd('myset', 'a', 'b');
			expect(result).toBe(2);
			expect(mockRedis.sadd).toHaveBeenCalledWith('myset', 'a', 'b');
		});

		it('should throw when redis fails', async () => {
			mockRedis.sadd.mockRejectedValue(new Error('Redis error'));
			await expect(service.sadd('myset', 'a')).rejects.toThrow('Redis error');
		});
	});

	describe('srem', () => {
		it('should remove members from a set and return count', async () => {
			mockRedis.srem.mockResolvedValue(1);
			const result = await service.srem('myset', 'a');
			expect(result).toBe(1);
			expect(mockRedis.srem).toHaveBeenCalledWith('myset', 'a');
		});

		it('should throw when redis fails', async () => {
			mockRedis.srem.mockRejectedValue(new Error('Redis error'));
			await expect(service.srem('myset', 'a')).rejects.toThrow('Redis error');
		});
	});

	describe('smembers', () => {
		it('should return set members', async () => {
			mockRedis.smembers.mockResolvedValue(['a', 'b', 'c']);
			const result = await service.smembers('myset');
			expect(result).toEqual(['a', 'b', 'c']);
		});

		it('should return empty array when redis fails', async () => {
			mockRedis.smembers.mockRejectedValue(new Error('Redis error'));
			const result = await service.smembers('myset');
			expect(result).toEqual([]);
		});
	});

	describe('sismember', () => {
		it('should return true when member is in set', async () => {
			mockRedis.sismember.mockResolvedValue(1);
			expect(await service.sismember('myset', 'a')).toBe(true);
		});

		it('should return false when member is not in set', async () => {
			mockRedis.sismember.mockResolvedValue(0);
			expect(await service.sismember('myset', 'a')).toBe(false);
		});

		it('should return false when redis fails', async () => {
			mockRedis.sismember.mockRejectedValue(new Error('Redis error'));
			expect(await service.sismember('myset', 'a')).toBe(false);
		});
	});

	describe('zadd', () => {
		it('should add member to sorted set and return count', async () => {
			mockRedis.zadd.mockResolvedValue(1);
			const result = await service.zadd('zset', 1.0, 'member');
			expect(result).toBe(1);
			expect(mockRedis.zadd).toHaveBeenCalledWith('zset', 1.0, 'member');
		});

		it('should throw when redis fails', async () => {
			mockRedis.zadd.mockRejectedValue(new Error('Redis error'));
			await expect(service.zadd('zset', 1.0, 'member')).rejects.toThrow('Redis error');
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

	describe('zrem', () => {
		it('should remove members from sorted set and return count', async () => {
			mockRedis.zrem.mockResolvedValue(1);
			const result = await service.zrem('zset', 'a', 'b');
			expect(result).toBe(1);
			expect(mockRedis.zrem).toHaveBeenCalledWith('zset', 'a', 'b');
		});

		it('should throw when redis fails', async () => {
			mockRedis.zrem.mockRejectedValue(new Error('Redis error'));
			await expect(service.zrem('zset', 'a')).rejects.toThrow('Redis error');
		});
	});

	describe('incr', () => {
		it('should increment counter and return new value', async () => {
			mockRedis.incr.mockResolvedValue(5);
			const result = await service.incr('counter');
			expect(result).toBe(5);
			expect(mockRedis.incr).toHaveBeenCalledWith('counter');
		});

		it('should throw when redis fails', async () => {
			mockRedis.incr.mockRejectedValue(new Error('Redis error'));
			await expect(service.incr('counter')).rejects.toThrow('Redis error');
		});
	});

	describe('decr', () => {
		it('should decrement counter and return new value', async () => {
			mockRedis.decr.mockResolvedValue(3);
			const result = await service.decr('counter');
			expect(result).toBe(3);
			expect(mockRedis.decr).toHaveBeenCalledWith('counter');
		});

		it('should throw when redis fails', async () => {
			mockRedis.decr.mockRejectedValue(new Error('Redis error'));
			await expect(service.decr('counter')).rejects.toThrow('Redis error');
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

	describe('flushall', () => {
		it('should flush all keys', async () => {
			mockRedis.flushall.mockResolvedValue('OK');
			await expect(service.flushall()).resolves.toBeUndefined();
			expect(mockRedis.flushall).toHaveBeenCalled();
		});

		it('should throw when redis fails', async () => {
			mockRedis.flushall.mockRejectedValue(new Error('Redis error'));
			await expect(service.flushall()).rejects.toThrow('Redis error');
		});
	});
});
