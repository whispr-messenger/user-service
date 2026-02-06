import { CacheModuleAsyncOptions, CacheOptions } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';

export const cacheHealth = {
	isHealthy: true,
	lastError: null as Error | null,
};

export function cacheModuleOptionsFactory(configService: ConfigService): CacheOptions {
	const redis_host = configService.get('REDIS_HOST', 'redis');
	const redis_port = configService.get('REDIS_PORT', 6379);
	const redis_username = configService.get('REDIS_USERNAME');
	const redis_password = configService.get('REDIS_PASSWORD');
	const redis_db = configService.get('REDIS_DB', 0);
	const node_env = configService.get('NODE_ENV', 'development');

	if (node_env === 'production' && (!redis_username || !redis_password)) {
		throw new Error('REDIS_USERNAME and REDIS_PASSWORD must be provided in production');
	}

	const url = new URL(`redis://${redis_host}:${redis_port}/${redis_db}`);
	if (redis_username) url.username = redis_username;
	if (redis_password) url.password = redis_password;

	const redis_url = url.toString();

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
