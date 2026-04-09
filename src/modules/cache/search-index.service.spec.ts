import { SearchIndexService } from './search-index.service';
import { CacheService } from './cache.service';
import { User } from '../common/entities/user.entity';

const mockCacheService = {
	pipeline: jest.fn(),
	get: jest.fn(),
	keys: jest.fn(),
	zrange: jest.fn(),
	delMany: jest.fn(),
} as unknown as CacheService;

function makeUser(overrides: Partial<User> = {}): User {
	return {
		id: 'user-1',
		phoneNumber: '+1234567890',
		username: 'Alice',
		firstName: 'Alice',
		lastName: 'Smith',
		biography: null,
		profilePictureUrl: null,
		lastSeen: null,
		isActive: true,
		createdAt: new Date('2024-01-01T00:00:00Z'),
		updatedAt: new Date('2024-01-01T00:00:00Z'),
		...overrides,
	} as User;
}

describe('SearchIndexService', () => {
	let service: SearchIndexService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new SearchIndexService(mockCacheService);
	});

	describe('indexUser', () => {
		it('should call pipeline with correct commands for a user', async () => {
			mockCacheService.pipeline = jest.fn().mockResolvedValue(undefined);
			const user = makeUser();

			await service.indexUser(user);

			expect(mockCacheService.pipeline).toHaveBeenCalledTimes(1);
			const [commands] = (mockCacheService.pipeline as jest.Mock).mock.calls[0];
			expect(commands).toContainEqual(['hset', 'search:phone', user.phoneNumber, user.id]);
			expect(commands).toContainEqual([
				'hset',
				'search:username',
				user.username.toLowerCase(),
				user.id,
			]);
		});

		it('should throw when pipeline fails', async () => {
			mockCacheService.pipeline = jest.fn().mockRejectedValue(new Error('Redis error'));

			await expect(service.indexUser(makeUser())).rejects.toThrow('Redis error');
		});
	});

	describe('removeUserFromIndex', () => {
		it('should call pipeline with hdel and zrem commands', async () => {
			mockCacheService.pipeline = jest.fn().mockResolvedValue(undefined);
			const user = makeUser();

			await service.removeUserFromIndex(user);

			const [commands] = (mockCacheService.pipeline as jest.Mock).mock.calls[0];
			expect(commands).toContainEqual(['hdel', 'search:phone', user.phoneNumber]);
			expect(commands).toContainEqual(['hdel', 'search:username', user.username.toLowerCase()]);
			expect(commands).toContainEqual(['del', `user:cache:${user.id}`]);
		});

		it('should throw when pipeline fails', async () => {
			mockCacheService.pipeline = jest.fn().mockRejectedValue(new Error('Redis error'));

			await expect(service.removeUserFromIndex(makeUser())).rejects.toThrow('Redis error');
		});
	});

	describe('searchByPhoneNumber', () => {
		it('should return userId from cache', async () => {
			mockCacheService.get = jest.fn().mockResolvedValue('user-1');

			const result = await service.searchByPhoneNumber('+1234567890');

			expect(mockCacheService.get).toHaveBeenCalledWith('search:phone:+1234567890');
			expect(result).toBe('user-1');
		});

		it('should return null when cache throws', async () => {
			mockCacheService.get = jest.fn().mockRejectedValue(new Error('Redis error'));

			const result = await service.searchByPhoneNumber('+1234567890');

			expect(result).toBeNull();
		});
	});

	describe('searchByUsername', () => {
		it('should return userId from cache (lowercased key)', async () => {
			mockCacheService.get = jest.fn().mockResolvedValue('user-1');

			const result = await service.searchByUsername('Alice');

			expect(mockCacheService.get).toHaveBeenCalledWith('search:username:alice');
			expect(result).toBe('user-1');
		});

		it('should return null when cache throws', async () => {
			mockCacheService.get = jest.fn().mockRejectedValue(new Error('Redis error'));

			const result = await service.searchByUsername('Alice');

			expect(result).toBeNull();
		});
	});

	describe('searchByName', () => {
		it('should return direct zrange results when limit is reached', async () => {
			mockCacheService.zrange = jest.fn().mockResolvedValue(['user-1', 'user-2']);
			mockCacheService.keys = jest.fn().mockResolvedValue([]);

			const result = await service.searchByName('alice', 2);

			expect(result).toEqual(['user-1', 'user-2']);
		});

		it('should do partial-match loop when direct results are below limit', async () => {
			mockCacheService.zrange = jest
				.fn()
				.mockResolvedValueOnce(['user-1']) // direct hit
				.mockResolvedValueOnce(['user-2']); // partial match loop
			mockCacheService.keys = jest.fn().mockResolvedValue(['search:name:alice-smith']);

			const result = await service.searchByName('alice', 5);

			expect(result).toContain('user-1');
			expect(result).toContain('user-2');
		});

		it('should stop partial-match loop when limit is reached', async () => {
			const directIds = ['u1', 'u2'];
			mockCacheService.zrange = jest.fn().mockResolvedValue(directIds);
			mockCacheService.keys = jest
				.fn()
				.mockResolvedValue(['search:name:alice-a', 'search:name:alice-b', 'search:name:alice-c']);
			// Simulate more results when iterating partial keys
			(mockCacheService.zrange as jest.Mock)
				.mockResolvedValueOnce(['u1', 'u2']) // first call (direct)
				.mockResolvedValue(['u3', 'u4']); // subsequent calls

			const result = await service.searchByName('alice', 2);

			expect(result.length).toBeLessThanOrEqual(2);
		});

		it('should return [] when an error occurs', async () => {
			mockCacheService.zrange = jest.fn().mockRejectedValue(new Error('Redis error'));

			const result = await service.searchByName('alice');

			expect(result).toEqual([]);
		});
	});

	describe('getCachedUser', () => {
		it('should return cached user entry', async () => {
			const entry = { userId: 'user-1', phoneNumber: '+1' } as any;
			mockCacheService.get = jest.fn().mockResolvedValue(entry);

			const result = await service.getCachedUser('user-1');

			expect(mockCacheService.get).toHaveBeenCalledWith('user:cache:user-1');
			expect(result).toBe(entry);
		});

		it('should return null when cache throws', async () => {
			mockCacheService.get = jest.fn().mockRejectedValue(new Error('Redis error'));

			const result = await service.getCachedUser('user-1');

			expect(result).toBeNull();
		});
	});

	describe('batchIndexUsers', () => {
		it('should not call pipeline when users array is empty', async () => {
			mockCacheService.pipeline = jest.fn().mockResolvedValue(undefined);

			await service.batchIndexUsers([]);

			expect(mockCacheService.pipeline).not.toHaveBeenCalled();
		});

		it('should call pipeline with commands for each user', async () => {
			mockCacheService.pipeline = jest.fn().mockResolvedValue(undefined);
			const users = [
				makeUser({ id: 'u1', username: 'alice' }),
				makeUser({ id: 'u2', username: 'bob' }),
			];

			await service.batchIndexUsers(users);

			expect(mockCacheService.pipeline).toHaveBeenCalledTimes(1);
			const [commands] = (mockCacheService.pipeline as jest.Mock).mock.calls[0];
			expect(commands).toContainEqual(['hset', 'search:phone', users[0].phoneNumber, 'u1']);
			expect(commands).toContainEqual(['hset', 'search:username', 'bob', 'u2']);
		});

		it('should throw when pipeline fails', async () => {
			mockCacheService.pipeline = jest.fn().mockRejectedValue(new Error('Redis error'));

			await expect(service.batchIndexUsers([makeUser()])).rejects.toThrow('Redis error');
		});
	});

	describe('clearAllIndexes', () => {
		it('should delete all search and user cache keys', async () => {
			mockCacheService.keys = jest
				.fn()
				.mockResolvedValueOnce(['search:phone', 'search:username'])
				.mockResolvedValueOnce(['user:cache:u1'])
				.mockResolvedValueOnce(['search:name:alice']);
			mockCacheService.delMany = jest.fn().mockResolvedValue(undefined);

			await service.clearAllIndexes();

			expect(mockCacheService.delMany).toHaveBeenCalledWith(
				expect.arrayContaining([
					'search:phone',
					'search:username',
					'user:cache:u1',
					'search:name:alice',
				])
			);
		});

		it('should not call delMany when no keys found', async () => {
			mockCacheService.keys = jest.fn().mockResolvedValue([]);
			mockCacheService.delMany = jest.fn();

			await service.clearAllIndexes();

			expect(mockCacheService.delMany).not.toHaveBeenCalled();
		});

		it('should throw when an error occurs', async () => {
			mockCacheService.keys = jest.fn().mockRejectedValue(new Error('Redis error'));

			await expect(service.clearAllIndexes()).rejects.toThrow('Redis error');
		});
	});

	describe('getSearchStats', () => {
		it('should return counts from cache', async () => {
			mockCacheService.get = jest.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(5);
			mockCacheService.keys = jest
				.fn()
				.mockResolvedValueOnce(['k1', 'k2', 'k3'])
				.mockResolvedValueOnce(['c1', 'c2']);

			const result = await service.getSearchStats();

			expect(result).toEqual({
				totalPhoneIndexes: 10,
				totalUsernameIndexes: 5,
				totalNameIndexes: 3,
				totalCachedUsers: 2,
			});
		});

		it('should return zeros when an error occurs', async () => {
			mockCacheService.get = jest.fn().mockRejectedValue(new Error('Redis error'));

			const result = await service.getSearchStats();

			expect(result).toEqual({
				totalPhoneIndexes: 0,
				totalUsernameIndexes: 0,
				totalNameIndexes: 0,
				totalCachedUsers: 0,
			});
		});
	});
});
