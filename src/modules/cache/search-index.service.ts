import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { User } from '../common/entities/user.entity';

export interface SearchIndexEntry {
	userId: string;
	phoneNumber: string;
	username: string;
	firstName: string;
	lastName: string;
	fullName: string;
	isActive: boolean;
	createdAt: Date;
}

@Injectable()
export class SearchIndexService {
	private readonly logger = new Logger(SearchIndexService.name);
	private readonly PHONE_INDEX_KEY = 'search:phone';
	private readonly USERNAME_INDEX_KEY = 'search:username';
	private readonly NAME_INDEX_KEY = 'search:name';
	private readonly USER_CACHE_PREFIX = 'user:cache';
	private readonly CACHE_TTL = 3600; // 1 hour

	constructor(private cacheService: CacheService) {}

	async indexUser(user: User): Promise<void> {
		try {
			const firstName = user.firstName ?? null;
			const lastName = user.lastName ?? null;
			const fullName =
				firstName || lastName
					? `${firstName ?? ''} ${lastName ?? ''}`.toLowerCase().trim()
					: null;

			const indexEntry: SearchIndexEntry = {
				userId: user.id,
				phoneNumber: user.phoneNumber,
				username: user.username,
				firstName,
				lastName,
				fullName: fullName ?? '',
				isActive: user.isActive,
				createdAt: user.createdAt,
			};

			const commands: Array<[string, ...any[]]> = [
				['hset', this.PHONE_INDEX_KEY, user.phoneNumber, user.id],
			];

			if (user.username) {
				commands.push(['hset', this.USERNAME_INDEX_KEY, user.username.toLowerCase(), user.id]);
			}
			if (firstName) {
				commands.push([
					'zadd',
					`${this.NAME_INDEX_KEY}:${firstName.toLowerCase()}`,
					user.createdAt.getTime(),
					user.id,
				]);
			}
			if (lastName) {
				commands.push([
					'zadd',
					`${this.NAME_INDEX_KEY}:${lastName.toLowerCase()}`,
					user.createdAt.getTime(),
					user.id,
				]);
			}
			if (fullName) {
				commands.push([
					'zadd',
					`${this.NAME_INDEX_KEY}:${fullName}`,
					user.createdAt.getTime(),
					user.id,
				]);
			}
			commands.push([
				'setex',
				`${this.USER_CACHE_PREFIX}:${user.id}`,
				this.CACHE_TTL,
				JSON.stringify(indexEntry),
			]);

			await this.cacheService.pipeline(commands);
			this.logger.debug(`Indexed user ${user.id} in search indexes`);
		} catch (error) {
			this.logger.error(`Failed to index user ${user.id}:`, error);
			throw error;
		}
	}

	async removeUserFromIndex(user: User): Promise<void> {
		try {
			const fullName = `${user.firstName} ${user.lastName}`.toLowerCase().trim();

			const commands: Array<[string, ...any[]]> = [
				['hdel', this.PHONE_INDEX_KEY, user.phoneNumber],
				['hdel', this.USERNAME_INDEX_KEY, user.username.toLowerCase()],
				['zrem', `${this.NAME_INDEX_KEY}:${user.firstName.toLowerCase()}`, user.id],
				['zrem', `${this.NAME_INDEX_KEY}:${user.lastName.toLowerCase()}`, user.id],
				['zrem', `${this.NAME_INDEX_KEY}:${fullName}`, user.id],
				['del', `${this.USER_CACHE_PREFIX}:${user.id}`],
			];

			await this.cacheService.pipeline(commands);
			this.logger.debug(`Removed user ${user.id} from search indexes`);
		} catch (error) {
			this.logger.error(`Failed to remove user ${user.id} from indexes:`, error);
			throw error;
		}
	}

	async searchByPhoneNumber(phoneNumber: string): Promise<string | null> {
		try {
			return await this.cacheService.hget(this.PHONE_INDEX_KEY, phoneNumber);
		} catch (error) {
			this.logger.error(`Failed to search by phone number ${phoneNumber}:`, error);
			return null;
		}
	}

	async searchByUsername(username: string): Promise<string | null> {
		try {
			return await this.cacheService.hget(this.USERNAME_INDEX_KEY, username.toLowerCase());
		} catch (error) {
			this.logger.error(`Failed to search by username ${username}:`, error);
			return null;
		}
	}

	async searchByName(query: string, limit: number = 20): Promise<string[]> {
		try {
			const normalizedQuery = query.toLowerCase().trim();
			const userIds = new Set<string>();

			const ids = await this.cacheService.zrange(
				`${this.NAME_INDEX_KEY}:${normalizedQuery}`,
				0,
				limit - 1
			);
			ids.forEach((id) => userIds.add(id));

			if (userIds.size < limit) {
				const allNameKeys = await this.cacheService.keys(`${this.NAME_INDEX_KEY}:*`);
				for (const key of allNameKeys) {
					const nameFromKey = key.replace(`${this.NAME_INDEX_KEY}:`, '');
					if (nameFromKey.includes(normalizedQuery) || normalizedQuery.includes(nameFromKey)) {
						const moreIds = await this.cacheService.zrange(key, 0, limit - 1);
						moreIds.forEach((id) => userIds.add(id));
						if (userIds.size >= limit) break;
					}
				}
			}

			return Array.from(userIds).slice(0, limit);
		} catch (error) {
			this.logger.error(`Failed to search by name ${query}:`, error);
			return [];
		}
	}

	async getCachedUser(userId: string): Promise<SearchIndexEntry | null> {
		try {
			return await this.cacheService.get<SearchIndexEntry>(`${this.USER_CACHE_PREFIX}:${userId}`);
		} catch (error) {
			this.logger.error(`Failed to get cached user ${userId}:`, error);
			return null;
		}
	}

	async batchIndexUsers(users: User[]): Promise<void> {
		try {
			const commands: Array<[string, ...any[]]> = [];

			for (const user of users) {
				const indexEntry: SearchIndexEntry = {
					userId: user.id,
					phoneNumber: user.phoneNumber,
					username: user.username,
					firstName: user.firstName,
					lastName: user.lastName,
					fullName: `${user.firstName} ${user.lastName}`.toLowerCase().trim(),
					isActive: user.isActive,
					createdAt: user.createdAt,
				};

				commands.push(
					['hset', this.PHONE_INDEX_KEY, user.phoneNumber, user.id],
					['hset', this.USERNAME_INDEX_KEY, user.username.toLowerCase(), user.id],
					[
						'zadd',
						`${this.NAME_INDEX_KEY}:${user.firstName.toLowerCase()}`,
						user.createdAt.getTime(),
						user.id,
					],
					[
						'zadd',
						`${this.NAME_INDEX_KEY}:${user.lastName.toLowerCase()}`,
						user.createdAt.getTime(),
						user.id,
					],
					[
						'zadd',
						`${this.NAME_INDEX_KEY}:${indexEntry.fullName}`,
						user.createdAt.getTime(),
						user.id,
					],
					[
						'setex',
						`${this.USER_CACHE_PREFIX}:${user.id}`,
						this.CACHE_TTL,
						JSON.stringify(indexEntry),
					]
				);
			}

			if (commands.length > 0) {
				await this.cacheService.pipeline(commands);
			}
			this.logger.debug(`Batch indexed ${users.length} users`);
		} catch (error) {
			this.logger.error(`Failed to batch index users:`, error);
			throw error;
		}
	}

	async clearAllIndexes(): Promise<void> {
		try {
			const keys = await this.cacheService.keys('search:*');
			const userCacheKeys = await this.cacheService.keys(`${this.USER_CACHE_PREFIX}:*`);
			const nameIndexKeys = await this.cacheService.keys(`${this.NAME_INDEX_KEY}:*`);
			const allKeys = [...keys, ...userCacheKeys, ...nameIndexKeys];
			if (allKeys.length > 0) {
				await this.cacheService.delMany(allKeys);
			}
			this.logger.warn('Cleared all search indexes');
		} catch (error) {
			this.logger.error('Failed to clear search indexes:', error);
			throw error;
		}
	}

	async getSearchStats(): Promise<{
		totalPhoneIndexes: number;
		totalUsernameIndexes: number;
		totalNameIndexes: number;
		totalCachedUsers: number;
	}> {
		try {
			const [phoneCount, usernameCount, nameIndexKeys, cachedUserKeys] = await Promise.all([
				this.cacheService.get<number>(`${this.PHONE_INDEX_KEY}:count`).then((v) => v ?? 0),
				this.cacheService.get<number>(`${this.USERNAME_INDEX_KEY}:count`).then((v) => v ?? 0),
				this.cacheService.keys(`${this.NAME_INDEX_KEY}:*`),
				this.cacheService.keys(`${this.USER_CACHE_PREFIX}:*`),
			]);

			return {
				totalPhoneIndexes: phoneCount as number,
				totalUsernameIndexes: usernameCount as number,
				totalNameIndexes: nameIndexKeys.length,
				totalCachedUsers: cachedUserKeys.length,
			};
		} catch (error) {
			this.logger.error('Failed to get search stats:', error);
			return {
				totalPhoneIndexes: 0,
				totalUsernameIndexes: 0,
				totalNameIndexes: 0,
				totalCachedUsers: 0,
			};
		}
	}
}
