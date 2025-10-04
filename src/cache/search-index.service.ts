import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { User } from '../entities';

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

  /**
   * Add or update user in search indexes
   */
  async indexUser(user: User): Promise<void> {
    try {
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

      // Use pipeline for atomic operations
      const commands: Array<[string, ...any[]]> = [
        // Phone number index (hash: phone -> userId)
        ['hset', this.PHONE_INDEX_KEY, user.phoneNumber, user.id],

        // Username index (hash: username -> userId)
        ['hset', this.USERNAME_INDEX_KEY, user.username.toLowerCase(), user.id],

        // Name search index (sorted set: score based on creation time)
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

        // Cache user data
        [
          'setex',
          `${this.USER_CACHE_PREFIX}:${user.id}`,
          this.CACHE_TTL,
          JSON.stringify(indexEntry),
        ],
      ];

      await this.cacheService.pipeline(commands);

      this.logger.debug(`Indexed user ${user.id} in search indexes`);
    } catch (error) {
      this.logger.error(`Failed to index user ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * Remove user from search indexes
   */
  async removeUserFromIndex(user: User): Promise<void> {
    try {
      const fullName = `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .trim();

      const commands: Array<[string, ...any[]]> = [
        // Remove from phone index
        ['hdel', this.PHONE_INDEX_KEY, user.phoneNumber],

        // Remove from username index
        ['hdel', this.USERNAME_INDEX_KEY, user.username.toLowerCase()],

        // Remove from name indexes
        [
          'zrem',
          `${this.NAME_INDEX_KEY}:${user.firstName.toLowerCase()}`,
          user.id,
        ],
        [
          'zrem',
          `${this.NAME_INDEX_KEY}:${user.lastName.toLowerCase()}`,
          user.id,
        ],
        ['zrem', `${this.NAME_INDEX_KEY}:${fullName}`, user.id],

        // Remove from cache
        ['del', `${this.USER_CACHE_PREFIX}:${user.id}`],
      ];

      await this.cacheService.pipeline(commands);

      this.logger.debug(`Removed user ${user.id} from search indexes`);
    } catch (error) {
      this.logger.error(
        `Failed to remove user ${user.id} from indexes:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Search user by phone number
   */
  async searchByPhoneNumber(phoneNumber: string): Promise<string | null> {
    try {
      const userId = await this.cacheService.get<string>(
        `${this.PHONE_INDEX_KEY}:${phoneNumber}`,
      );
      return userId;
    } catch (error) {
      this.logger.error(
        `Failed to search by phone number ${phoneNumber}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Search user by username
   */
  async searchByUsername(username: string): Promise<string | null> {
    try {
      const userId = await this.cacheService.get<string>(
        `${this.USERNAME_INDEX_KEY}:${username.toLowerCase()}`,
      );
      return userId;
    } catch (error) {
      this.logger.error(`Failed to search by username ${username}:`, error);
      return null;
    }
  }

  /**
   * Search users by name (first name, last name, or full name)
   */
  async searchByName(query: string, limit: number = 20): Promise<string[]> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      const userIds = new Set<string>();

      // Search in different name indexes
      const searchKeys = [
        `${this.NAME_INDEX_KEY}:${normalizedQuery}`,
        // Also search for partial matches by checking if any indexed names start with the query
      ];

      for (const key of searchKeys) {
        const ids = await this.cacheService.zrange(key, 0, limit - 1);
        ids.forEach((id) => userIds.add(id));

        if (userIds.size >= limit) break;
      }

      // If we don't have enough results, try fuzzy matching
      if (userIds.size < limit) {
        const allNameKeys = await this.cacheService.keys(
          `${this.NAME_INDEX_KEY}:*`,
        );

        for (const key of allNameKeys) {
          const nameFromKey = key.replace(`${this.NAME_INDEX_KEY}:`, '');
          if (
            nameFromKey.includes(normalizedQuery) ||
            normalizedQuery.includes(nameFromKey)
          ) {
            const ids = await this.cacheService.zrange(key, 0, limit - 1);
            ids.forEach((id) => userIds.add(id));

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

  /**
   * Get cached user data
   */
  async getCachedUser(userId: string): Promise<SearchIndexEntry | null> {
    try {
      return await this.cacheService.get<SearchIndexEntry>(
        `${this.USER_CACHE_PREFIX}:${userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to get cached user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Batch index multiple users
   */
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
          [
            'hset',
            this.USERNAME_INDEX_KEY,
            user.username.toLowerCase(),
            user.id,
          ],
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
          ],
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

  /**
   * Clear all search indexes (use with caution)
   */
  async clearAllIndexes(): Promise<void> {
    try {
      const keys = await this.cacheService.keys('search:*');
      const userCacheKeys = await this.cacheService.keys(
        `${this.USER_CACHE_PREFIX}:*`,
      );
      const nameIndexKeys = await this.cacheService.keys(
        `${this.NAME_INDEX_KEY}:*`,
      );

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

  /**
   * Get search statistics
   */
  async getSearchStats(): Promise<{
    totalPhoneIndexes: number;
    totalUsernameIndexes: number;
    totalNameIndexes: number;
    totalCachedUsers: number;
  }> {
    try {
      const [phoneCount, usernameCount, nameIndexKeys, cachedUserKeys] =
        await Promise.all([
          this.cacheService.get<number>(`${this.PHONE_INDEX_KEY}:count`) || 0,
          this.cacheService.get<number>(`${this.USERNAME_INDEX_KEY}:count`) ||
            0,
          this.cacheService.keys(`${this.NAME_INDEX_KEY}:*`),
          this.cacheService.keys(`${this.USER_CACHE_PREFIX}:*`),
        ]);

      return {
        totalPhoneIndexes: phoneCount,
        totalUsernameIndexes: usernameCount,
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
