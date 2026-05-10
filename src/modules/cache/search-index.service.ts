import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { User } from '../common/entities/user.entity';

export interface SearchIndexEntry {
	userId: string;
	phoneNumber: string;
	username: string | null;
	firstName: string | null;
	lastName: string | null;
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
			const normalizedUsername = user.username?.toLowerCase();
			const normalizedFirstName = user.firstName?.toLowerCase();
			const normalizedLastName = user.lastName?.toLowerCase();
			const normalizedFullName = [user.firstName, user.lastName]
				.filter((p): p is string => !!p)
				.join(' ')
				.toLowerCase()
				.trim();

			const indexEntry: SearchIndexEntry = {
				userId: user.id,
				phoneNumber: user.phoneNumber,
				username: user.username ?? null,
				firstName: user.firstName ?? null,
				lastName: user.lastName ?? null,
				fullName: normalizedFullName,
				isActive: user.isActive,
				createdAt: user.createdAt,
			};

			const commands: Array<[string, ...any[]]> = [
				['hset', this.PHONE_INDEX_KEY, user.phoneNumber, user.id],
				['setex', `${this.USER_CACHE_PREFIX}:${user.id}`, this.CACHE_TTL, JSON.stringify(indexEntry)],
			];

			if (normalizedUsername) {
				commands.push(['hset', this.USERNAME_INDEX_KEY, normalizedUsername, user.id]);
			}
			if (normalizedFirstName) {
				commands.push([
					'zadd',
					`${this.NAME_INDEX_KEY}:${normalizedFirstName}`,
					user.createdAt.getTime(),
					user.id,
				]);
			}
			if (normalizedLastName) {
				commands.push([
					'zadd',
					`${this.NAME_INDEX_KEY}:${normalizedLastName}`,
					user.createdAt.getTime(),
					user.id,
				]);
			}
			if (normalizedFullName) {
				commands.push([
					'zadd',
					`${this.NAME_INDEX_KEY}:${normalizedFullName}`,
					user.createdAt.getTime(),
					user.id,
				]);
			}

			await this.cacheService.pipeline(commands);
			this.logger.debug(`Indexed user ${user.id} in search indexes`);
		} catch (error) {
			this.logger.error(`Failed to index user ${user.id}:`, error);
			throw error;
		}
	}

	/**
	 * Reconcile search indexes for a profile update by emitting only the
	 * commands needed for the actual diff between `prev` and `next`.
	 *
	 * The legacy `indexUser(saved)` followed by `removeUserFromIndex(prev)`
	 * pattern would `HDEL search:phone` and `DEL user:cache:<userId>` for
	 * keys that were just rewritten — wiping the user from the search caches
	 * after every profile edit (WHISPR-1271). This method skips deletes for
	 * stable fields (phone, userId) and for unchanged username/name parts,
	 * and bundles everything in a single Redis pipeline.
	 */
	async updateUserIndex(prev: User, next: User): Promise<void> {
		try {
			const indexEntry: SearchIndexEntry = {
				userId: next.id,
				phoneNumber: next.phoneNumber,
				username: next.username ?? null,
				firstName: next.firstName ?? null,
				lastName: next.lastName ?? null,
				fullName: this.buildFullName(next),
				isActive: next.isActive,
				createdAt: next.createdAt,
			};

			const commands: Array<[string, ...any[]]> = [
				// Phone is immutable for a profile edit and userId never changes;
				// HSET / SETEX overwrite any existing value, no HDEL/DEL needed.
				['hset', this.PHONE_INDEX_KEY, next.phoneNumber, next.id],
				['setex', `${this.USER_CACHE_PREFIX}:${next.id}`, this.CACHE_TTL, JSON.stringify(indexEntry)],
			];

			const prevUsername = prev.username?.toLowerCase();
			const nextUsername = next.username?.toLowerCase();
			if (prevUsername && prevUsername !== nextUsername) {
				commands.push(['hdel', this.USERNAME_INDEX_KEY, prevUsername]);
			}
			if (nextUsername) {
				commands.push(['hset', this.USERNAME_INDEX_KEY, nextUsername, next.id]);
			}

			this.appendNameDiff(commands, prev.firstName, next.firstName, next);
			this.appendNameDiff(commands, prev.lastName, next.lastName, next);
			this.appendNameDiff(commands, this.buildFullName(prev), this.buildFullName(next), next);

			await this.cacheService.pipeline(commands);
			this.logger.debug(`Updated search indexes for user ${next.id}`);
		} catch (error) {
			this.logger.error(`Failed to update search indexes for user ${next.id}:`, error);
			throw error;
		}
	}

	private buildFullName(user: Pick<User, 'firstName' | 'lastName'>): string {
		return [user.firstName, user.lastName]
			.filter((p): p is string => !!p)
			.join(' ')
			.toLowerCase()
			.trim();
	}

	private appendNameDiff(
		commands: Array<[string, ...any[]]>,
		prevValue: string | null | undefined,
		nextValue: string | null | undefined,
		next: User
	): void {
		const prevNorm = prevValue?.toLowerCase();
		const nextNorm = nextValue?.toLowerCase();
		if (prevNorm && prevNorm !== nextNorm) {
			commands.push(['zrem', `${this.NAME_INDEX_KEY}:${prevNorm}`, next.id]);
		}
		if (nextNorm) {
			commands.push(['zadd', `${this.NAME_INDEX_KEY}:${nextNorm}`, next.createdAt.getTime(), next.id]);
		}
	}

	async removeUserFromIndex(user: User): Promise<void> {
		try {
			const normalizedUsername = user.username?.toLowerCase();
			const normalizedFirstName = user.firstName?.toLowerCase();
			const normalizedLastName = user.lastName?.toLowerCase();
			const fullName = [user.firstName, user.lastName]
				.filter((p): p is string => !!p)
				.join(' ')
				.toLowerCase()
				.trim();

			const commands: Array<[string, ...any[]]> = [
				['hdel', this.PHONE_INDEX_KEY, user.phoneNumber],
				['del', `${this.USER_CACHE_PREFIX}:${user.id}`],
			];

			if (normalizedUsername) {
				commands.push(['hdel', this.USERNAME_INDEX_KEY, normalizedUsername]);
			}
			if (normalizedFirstName) {
				commands.push(['zrem', `${this.NAME_INDEX_KEY}:${normalizedFirstName}`, user.id]);
			}
			if (normalizedLastName) {
				commands.push(['zrem', `${this.NAME_INDEX_KEY}:${normalizedLastName}`, user.id]);
			}
			if (fullName) {
				commands.push(['zrem', `${this.NAME_INDEX_KEY}:${fullName}`, user.id]);
			}

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
			const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 20;
			const normalizedQuery = query.toLowerCase().trim();

			const ids = await this.cacheService.zrange(
				`${this.NAME_INDEX_KEY}:${normalizedQuery}`,
				0,
				safeLimit - 1
			);

			return ids;
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
}
