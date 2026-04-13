import { Injectable, Logger } from '@nestjs/common';
import { RedisConfig } from '../../config/redis.config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
	private readonly logger = new Logger(CacheService.name);
	private readonly redis: Redis;

	constructor(private redisConfig: RedisConfig) {
		this.redis = this.redisConfig.getClient();
	}

	async get<T>(key: string): Promise<T | null> {
		try {
			const value = await this.redis.get(key);
			return value ? JSON.parse(value) : null;
		} catch (error) {
			this.logger.error(`Failed to get cache key ${key}:`, error);
			return null;
		}
	}

	async hget(key: string, field: string): Promise<string | null> {
		try {
			return await this.redis.hget(key, field);
		} catch (error) {
			this.logger.error(`Failed to hget field ${field} from ${key}:`, error);
			return null;
		}
	}

	async delMany(keys: string[]): Promise<void> {
		if (keys.length === 0) return;
		try {
			await this.redis.del(...keys);
		} catch (error) {
			this.logger.error(`Failed to delete cache keys:`, error);
			throw error;
		}
	}

	async keys(pattern: string): Promise<string[]> {
		try {
			return await this.redis.keys(pattern);
		} catch (error) {
			this.logger.error(`Failed to get keys with pattern ${pattern}:`, error);
			return [];
		}
	}

	async zrange(key: string, start: number, stop: number): Promise<string[]> {
		try {
			return await this.redis.zrange(key, start, stop);
		} catch (error) {
			this.logger.error(`Failed to get range from sorted set ${key}:`, error);
			return [];
		}
	}

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
}
