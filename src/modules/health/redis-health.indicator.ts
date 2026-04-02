import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { RedisConfig } from '../../config/redis.config';

const REDIS_PING_TIMEOUT_MS = 3_000;

@Injectable()
export class RedisHealthIndicator {
	constructor(
		private readonly healthIndicatorService: HealthIndicatorService,
		private readonly redisConfig: RedisConfig
	) {}

	async check(key: string): Promise<HealthIndicatorResult> {
		const indicator = this.healthIndicatorService.check(key);

		const health = this.redisConfig.health;
		if (!health.isHealthy) {
			return indicator.down({ message: health.lastError?.message ?? 'Redis connection is unhealthy' });
		}

		try {
			const client = this.redisConfig.getClient();
			const result = await Promise.race([
				client.ping(),
				new Promise<never>((_, reject) =>
					globalThis.setTimeout(
						() => reject(new Error('Redis ping timeout')),
						REDIS_PING_TIMEOUT_MS
					)
				),
			]);

			if (result !== 'PONG') {
				return indicator.down({ message: `Unexpected ping response: ${result}` });
			}

			return indicator.up();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return indicator.down({ message });
		}
	}
}
