import { CacheModuleAsyncOptions, CacheOptions } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';

export const cacheHealth = {
	isHealthy: true,
	lastError: null as Error | null,
};

export function cacheModuleOptionsFactory(configService: ConfigService): CacheOptions {
	const redis_url = configService.get('REDIS_URL', 'redis://localhost:6379/0');

	const logger = new Logger('CacheConfig');

	const keyvRedis = new KeyvRedis(redis_url);

	keyvRedis.on('error', (err) => {
		logger.error('Redis connection error', err);
		cacheHealth.isHealthy = false;
		cacheHealth.lastError = err;
	});

	// Wait for the internal client to be ready (KeyvRedis wraps it)
	// KeyvRedis doesn't expose the 'connect' event directly as easily,
	// but errors during operations will trigger the error event above.
	// We can assume healthy until an error occurs, or try to hook into the client.

	return {
		stores: [keyvRedis],
		ttl: 900,
		max: 1000,
	};
}

// Caching (Redis)
export const cacheModuleAsyncOptions: CacheModuleAsyncOptions = {
	imports: [ConfigModule],
	useFactory: cacheModuleOptionsFactory,
	inject: [ConfigService],
	isGlobal: true,
};
