import { CacheOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { Logger } from '@nestjs/common';

export function cacheModuleOptionsFactory(configService: ConfigService): CacheOptions {
	const logger = new Logger('CacheConfig');
	const redis_host = configService.get('REDIS_HOST', 'redis');
	const redis_port = configService.get('REDIS_PORT', 6379);
	const redis_password = configService.get('REDIS_PASSWORD');

	const redis_url = redis_password
		? `redis://:${redis_password}@${redis_host}:${redis_port}`
		: `redis://${redis_host}:${redis_port}`;

	// Configuration Redis avec options de résilience
	const redisOptions = {
		url: redis_url,
		// Options de reconnexion
		socket: {
			reconnectStrategy: (retries: number) => {
				if (retries > 20) {
					logger.error('Redis: Too many connection retries, stopping reconnect attempts');
					return new Error('Too many retries');
				}
				const delay = Math.min(retries * 100, 3000);
				logger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
				return delay;
			},
			connectTimeout: 10000,
		},
		// Désactiver les commandes qui échouent si Redis est down
		enableOfflineQueue: false,
	};

	// Créer le store Redis avec gestion d'erreurs
	const redisStore = new KeyvRedis(redisOptions);

	// Accéder au client Redis sous-jacent et ajouter des gestionnaires d'erreur
	if (redisStore.client) {
		// Gérer les erreurs pour éviter les crashs
		redisStore.client.on('error', (err: Error) => {
			logger.error(`Redis Cache Error: ${err.message}`);
			// Ne pas propager l'erreur pour éviter le crash
		});

		redisStore.client.on('connect', () => {
			logger.log('Redis Cache connected');
		});

		redisStore.client.on('ready', () => {
			logger.log('Redis Cache ready');
		});

		redisStore.client.on('reconnecting', () => {
			logger.warn('Redis Cache reconnecting...');
		});

		redisStore.client.on('end', () => {
			logger.warn('Redis Cache connection ended');
		});

		// Gérer la fermeture inattendue du socket
		redisStore.client.on('close', () => {
			logger.warn('Redis Cache connection closed');
		});
	}

	return {
		stores: [redisStore],
		ttl: 900,
		max: 1000,
	};
}
