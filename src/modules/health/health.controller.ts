import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { CacheService } from '../cache';
import { RedisConfig } from '../../config/redis.config';
import { Public } from '../jwt-auth/public.decorator';
import { JwksHealthIndicator } from '../jwt-auth/jwks-health.indicator';

@Public()
@ApiTags('Health')
@Controller('health')
export class HealthController {
	constructor(
		private readonly dataSource: DataSource,
		private readonly cacheService: CacheService,
		private readonly redisConfig: RedisConfig,
		private readonly jwksHealthIndicator: JwksHealthIndicator
	) {}

	private logger = new Logger(HealthController.name);

	@Get()
	@ApiOperation({
		summary: 'Check service health',
		description: 'Returns the health status of the service and its dependencies (database and cache)',
	})
	@ApiResponse({ status: 200, description: 'Health check completed successfully' })
	@ApiResponse({ status: 500, description: 'One or more services are unhealthy' })
	async check() {
		this.logger.debug('Health check started');

		const health = {
			status: 'ok',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			version: process.env.npm_package_version || '1.0.0',
			services: {
				database: 'unknown',
				cache: 'unknown',
			},
		};

		try {
			this.logger.debug('Checking database connection');
			await this.dataSource.query('SELECT 1');
			health.services.database = 'healthy';
			this.logger.debug('Database check passed');
		} catch (error) {
			if (process.env.NODE_ENV !== 'test') {
				const errorMessage = error instanceof Error ? error.message : String(error);
				this.logger.error('Database check failed:', errorMessage);
			}
			health.services.database = 'unhealthy';
			health.status = 'error';
		}

		try {
			await this.checkCacheHealth();
			health.services.cache = 'healthy';
		} catch (error) {
			if (process.env.NODE_ENV !== 'test') {
				const errorMessage = error instanceof Error ? error.message : String(error);
				this.logger.error('Cache check failed:', errorMessage);
			}
			health.services.cache = 'unhealthy';
			health.status = 'error';
		}

		if (health.status !== 'ok') {
			throw new ServiceUnavailableException(health);
		}

		this.logger.debug('Health check completed:', health);
		return health;
	}

	@Get('ready')
	@ApiOperation({
		summary: 'Check service readiness',
		description: 'Returns whether the service is ready to accept traffic',
	})
	@ApiResponse({ status: 200, description: 'Service is ready' })
	@ApiResponse({ status: 503, description: 'Service is not ready' })
	async readiness() {
		try {
			await this.dataSource.query('SELECT 1');
			await this.checkCacheHealth();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error('Readiness check failed:', errorMessage);
			throw new ServiceUnavailableException({
				status: 'not ready',
				error: errorMessage,
			});
		}

		const jwksResult = this.jwksHealthIndicator.check();
		if (jwksResult.jwks.status === 'down') {
			this.logger.warn('Readiness check failed: JWKS keys not loaded');
			throw new ServiceUnavailableException({
				status: 'not ready',
				error: 'JWKS keys not loaded',
			});
		}

		return { status: 'ready' };
	}

	private async checkCacheHealth() {
		this.logger.debug('Checking cache connection');

		const health = this.redisConfig.health;
		if (!health.isHealthy) {
			throw health.lastError || new Error('Redis connection is unhealthy');
		}

		await this.cacheService.set('health-check', 'ok', 10);
		const result = await this.cacheService.get<string>('health-check');

		if (result !== 'ok') {
			throw new Error('Cache operation failed: unexpected result');
		}
	}

	@Get('live')
	@ApiOperation({
		summary: 'Check service liveness',
		description: 'Returns whether the service is alive and responding',
	})
	@ApiResponse({ status: 200, description: 'Service is alive' })
	alive() {
		return {
			status: 'alive',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			version: process.env.npm_package_version || '1.0.0',
		};
	}
}
