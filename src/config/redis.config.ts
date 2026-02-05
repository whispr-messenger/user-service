import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisConfig {
	private readonly client: Redis;
	private readonly logger = new Logger(RedisConfig.name);

	constructor(private readonly configService: ConfigService) {
		this.client = new Redis({
			host: this.configService.get<string>('REDIS_HOST', 'localhost'),
			port: this.configService.get<number>('REDIS_PORT', 6379),
			password: this.configService.get<string>('REDIS_PASSWORD'),
			db: this.configService.get<number>('REDIS_DB', 0),
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
