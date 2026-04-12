import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../jwt-auth/public.decorator';
import { JwksHealthIndicator } from '../jwt-auth/jwks-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';

const DB_TIMEOUT_MS = 3_000;

@Public()
@SkipThrottle()
@ApiTags('Health')
@Controller('health')
export class HealthController {
	constructor(
		private readonly health: HealthCheckService,
		private readonly db: TypeOrmHealthIndicator,
		private readonly redis: RedisHealthIndicator,
		private readonly jwks: JwksHealthIndicator
	) {}

	@Get()
	@HealthCheck()
	@ApiOperation({
		summary: 'Check service health',
		description: 'Returns the health status of the service and its dependencies (database, cache, JWKS)',
	})
	@ApiResponse({ status: 200, description: 'Health check completed successfully' })
	@ApiResponse({ status: 503, description: 'One or more services are unhealthy' })
	check() {
		return this.health.check([
			() => this.db.pingCheck('database', { timeout: DB_TIMEOUT_MS }),
			() => this.redis.check('redis'),
			() => this.jwks.check('jwks'),
		]);
	}

	@Get('ready')
	@HealthCheck()
	@ApiOperation({
		summary: 'Check service readiness',
		description: 'Returns whether the service is ready to accept traffic (DB + Redis + JWKS)',
	})
	@ApiResponse({ status: 200, description: 'Service is ready' })
	@ApiResponse({ status: 503, description: 'Service is not ready' })
	readiness() {
		return this.health.check([
			() => this.db.pingCheck('database', { timeout: DB_TIMEOUT_MS }),
			() => this.redis.check('redis'),
			() => this.jwks.check('jwks'),
		]);
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
		};
	}
}
