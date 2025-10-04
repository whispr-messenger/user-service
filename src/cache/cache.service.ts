import { Injectable, Logger } from '@nestjs/common';
import { RedisConfig } from '../config/redis.config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;

  constructor(private redisConfig: RedisConfig) {
    this.redis = this.redisConfig.getClient();
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      await this.redis.del(...keys);
    } catch (error) {
      this.logger.error(`Failed to delete cache keys:`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(
        `Failed to check existence of cache key ${key}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Set TTL for a key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Failed to set TTL for cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.logger.error(`Failed to get keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Add to a Redis set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redis.sadd(key, ...members);
    } catch (error) {
      this.logger.error(`Failed to add to set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove from a Redis set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redis.srem(key, ...members);
    } catch (error) {
      this.logger.error(`Failed to remove from set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all members of a Redis set
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.redis.smembers(key);
    } catch (error) {
      this.logger.error(`Failed to get members of set ${key}:`, error);
      return [];
    }
  }

  /**
   * Check if a member exists in a Redis set
   */
  async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.redis.sismember(key, member);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check membership in set ${key}:`, error);
      return false;
    }
  }

  /**
   * Add to a sorted set with score
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.redis.zadd(key, score, member);
    } catch (error) {
      this.logger.error(`Failed to add to sorted set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get range from sorted set
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.redis.zrange(key, start, stop);
    } catch (error) {
      this.logger.error(`Failed to get range from sorted set ${key}:`, error);
      return [];
    }
  }

  /**
   * Remove from sorted set
   */
  async zrem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redis.zrem(key, ...members);
    } catch (error) {
      this.logger.error(`Failed to remove from sorted set ${key}:`, error);
      throw error;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      this.logger.error(`Failed to increment counter ${key}:`, error);
      throw error;
    }
  }

  /**
   * Decrement a counter
   */
  async decr(key: string): Promise<number> {
    try {
      return await this.redis.decr(key);
    } catch (error) {
      this.logger.error(`Failed to decrement counter ${key}:`, error);
      throw error;
    }
  }

  /**
   * Execute multiple commands in a pipeline
   */
  async pipeline(commands: Array<[string, ...any[]]>): Promise<any[]> {
    try {
      const pipeline = this.redis.pipeline();
      commands.forEach(([command, ...args]) => {
        (pipeline as any)[command](...args);
      });
      const results = await pipeline.exec();
      return (
        results?.map(([err, result]) => {
          if (err) throw err;
          return result;
        }) || []
      );
    } catch (error) {
      this.logger.error('Failed to execute pipeline:', error);
      throw error;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async flushall(): Promise<void> {
    try {
      await this.redis.flushall();
    } catch (error) {
      this.logger.error('Failed to flush all cache:', error);
      throw error;
    }
  }
}
