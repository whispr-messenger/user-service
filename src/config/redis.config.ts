import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisConfig {
	private readonly client: Redis;
	private readonly logger = new Logger(RedisConfig.name);

	constructor(private readonly configService: ConfigService) {
		const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379/0');

		this.client = new Redis(redisUrl, {
			maxRetriesPerRequest: 3,
			lazyConnect: true,
		});

		this.client.on('error', (err) => {
			this.logger.error('Redis connection error', err);
		});
	}

	getClient(): Redis {
		return this.client;
	}

	async onModuleDestroy() {
		await this.client.quit();
	}
}
