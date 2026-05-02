import { SearchIndexService } from './search-index.service';
import { CacheService } from './cache.service';
import { User } from '../common/entities/user.entity';

const mockCacheService = {
	pipeline: jest.fn(),
	get: jest.fn(),
	hget: jest.fn(),
	zrange: jest.fn(),
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
			mockCacheService.hget = jest.fn().mockResolvedValue('user-1');

			const result = await service.searchByPhoneNumber('+1234567890');

			expect(mockCacheService.hget).toHaveBeenCalledWith('search:phone', '+1234567890');
			expect(result).toBe('user-1');
		});

		it('should return null when cache throws', async () => {
			mockCacheService.hget = jest.fn().mockRejectedValue(new Error('Redis error'));

			const result = await service.searchByPhoneNumber('+1234567890');

			expect(result).toBeNull();
		});
	});

	describe('searchByUsername', () => {
		it('should return userId from cache (lowercased key)', async () => {
			mockCacheService.hget = jest.fn().mockResolvedValue('user-1');

			const result = await service.searchByUsername('Alice');

			expect(mockCacheService.hget).toHaveBeenCalledWith('search:username', 'alice');
			expect(result).toBe('user-1');
		});

		it('should return null when cache throws', async () => {
			mockCacheService.hget = jest.fn().mockRejectedValue(new Error('Redis error'));

			const result = await service.searchByUsername('Alice');

			expect(result).toBeNull();
		});
	});

	describe('searchByName', () => {
		it('should return zrange results for the normalized query', async () => {
			mockCacheService.zrange = jest.fn().mockResolvedValue(['user-1', 'user-2']);

			const result = await service.searchByName('Alice', 2);

			expect(mockCacheService.zrange).toHaveBeenCalledWith('search:name:alice', 0, 1);
			expect(result).toEqual(['user-1', 'user-2']);
		});

		it('should clamp limit to 1 when zero or negative', async () => {
			mockCacheService.zrange = jest.fn().mockResolvedValue(['user-1']);

			await service.searchByName('Alice', 0);

			expect(mockCacheService.zrange).toHaveBeenCalledWith('search:name:alice', 0, 0);
		});

		it('should floor fractional limit', async () => {
			mockCacheService.zrange = jest.fn().mockResolvedValue(['user-1', 'user-2']);

			await service.searchByName('Alice', 2.7);

			expect(mockCacheService.zrange).toHaveBeenCalledWith('search:name:alice', 0, 1);
		});

		it('should fall back to default limit when NaN', async () => {
			mockCacheService.zrange = jest.fn().mockResolvedValue([]);

			await service.searchByName('Alice', NaN);

			expect(mockCacheService.zrange).toHaveBeenCalledWith('search:name:alice', 0, 19);
		});

		it('should return [] when an error occurs', async () => {
			mockCacheService.zrange = jest.fn().mockRejectedValue(new Error('Redis error'));

			const result = await service.searchByName('alice');

			expect(result).toEqual([]);
		});
	});

	// WHISPR-1271 — the legacy pair `indexUser + removeUserFromIndex` would
	// HDEL/DEL keys it had just (re)written when phone/userId/unchanged
	// username were involved. `updateUserIndex` must only emit the commands
	// strictly needed for the diff between `prev` and `next`.
	describe('updateUserIndex', () => {
		it('only re-writes the phone index and user cache when phone is unchanged', async () => {
			mockCacheService.pipeline = jest.fn().mockResolvedValue(undefined);
			const prev = makeUser({ firstName: 'Alice' });
			const next = makeUser({ firstName: 'Alicia' });

			await service.updateUserIndex(prev, next);

			const [commands] = (mockCacheService.pipeline as jest.Mock).mock.calls[0];
			expect(commands).toContainEqual(['hset', 'search:phone', next.phoneNumber, next.id]);
			expect(commands.some((cmd: any[]) => cmd[0] === 'hdel' && cmd[1] === 'search:phone')).toBe(false);
			expect(
				commands.some((cmd: any[]) => cmd[0] === 'del' && String(cmd[1]).startsWith('user:cache:'))
			).toBe(false);
		});

		it('emits exactly HDEL old + HSET new when username changes alice → alicia', async () => {
			mockCacheService.pipeline = jest.fn().mockResolvedValue(undefined);
			const prev = makeUser({ username: 'alice' });
			const next = makeUser({ username: 'alicia' });

			await service.updateUserIndex(prev, next);

			const [commands] = (mockCacheService.pipeline as jest.Mock).mock.calls[0];
			const usernameOps = commands.filter((cmd: any[]) => cmd[1] === 'search:username');
			expect(usernameOps).toEqual([
				['hdel', 'search:username', 'alice'],
				['hset', 'search:username', 'alicia', next.id],
			]);
		});

		it('does not HDEL the username index when username is unchanged', async () => {
			mockCacheService.pipeline = jest.fn().mockResolvedValue(undefined);
			const prev = makeUser({ username: 'alice', firstName: 'Alice' });
			const next = makeUser({ username: 'alice', firstName: 'Alicia' });

			await service.updateUserIndex(prev, next);

			const [commands] = (mockCacheService.pipeline as jest.Mock).mock.calls[0];
			expect(commands.some((cmd: any[]) => cmd[0] === 'hdel' && cmd[1] === 'search:username')).toBe(
				false
			);
			// Stable HSET keeps the alice → user-1 mapping warm in the cache.
			expect(commands).toContainEqual(['hset', 'search:username', 'alice', next.id]);
		});

		it('drops old firstName zset and adds the new one when firstName changes', async () => {
			mockCacheService.pipeline = jest.fn().mockResolvedValue(undefined);
			const prev = makeUser({ firstName: 'Alice', lastName: 'Smith' });
			const next = makeUser({ firstName: 'Alicia', lastName: 'Smith' });

			await service.updateUserIndex(prev, next);

			const [commands] = (mockCacheService.pipeline as jest.Mock).mock.calls[0];
			expect(commands).toContainEqual(['zrem', 'search:name:alice', next.id]);
			expect(commands).toContainEqual([
				'zadd',
				'search:name:alicia',
				next.createdAt.getTime(),
				next.id,
			]);
			// lastName didn't change, so its zset is rewritten (zadd) but never removed.
			expect(commands.some((cmd: any[]) => cmd[0] === 'zrem' && cmd[1] === 'search:name:smith')).toBe(
				false
			);
		});

		it('does not emit zrem for unchanged firstName/lastName/fullName', async () => {
			mockCacheService.pipeline = jest.fn().mockResolvedValue(undefined);
			const prev = makeUser({ firstName: 'Alice', lastName: 'Smith', username: 'alice' });
			const next = makeUser({ firstName: 'Alice', lastName: 'Smith', username: 'alicia' });

			await service.updateUserIndex(prev, next);

			const [commands] = (mockCacheService.pipeline as jest.Mock).mock.calls[0];
			const zremOps = commands.filter((cmd: any[]) => cmd[0] === 'zrem');
			expect(zremOps).toEqual([]);
		});

		it('throws when pipeline fails', async () => {
			mockCacheService.pipeline = jest.fn().mockRejectedValue(new Error('Redis error'));

			await expect(service.updateUserIndex(makeUser(), makeUser())).rejects.toThrow('Redis error');
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
});
