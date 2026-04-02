import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { JwksHealthIndicator } from '../jwt-auth/jwks-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';

jest.mock('jwks-rsa', () => {
	const mockGetKeysFn = jest.fn();
	const MockClient = jest.fn().mockImplementation(() => ({ getKeys: mockGetKeysFn }));
	const mockPassport = jest.fn();
	return Object.assign(MockClient, {
		JwksClient: MockClient,
		passportJwtSecret: mockPassport,
	});
});

describe('HealthController', () => {
	let controller: HealthController;
	let healthCheckService: { check: jest.Mock };
	let dbIndicator: { pingCheck: jest.Mock };
	let redisIndicator: { check: jest.Mock };
	let jwksIndicator: { check: jest.Mock };

	beforeEach(async () => {
		healthCheckService = {
			check: jest.fn((indicators: (() => Promise<unknown>)[]) =>
				Promise.all(indicators.map((fn) => fn()))
			),
		};
		dbIndicator = { pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }) };
		redisIndicator = { check: jest.fn().mockResolvedValue({ redis: { status: 'up' } }) };
		jwksIndicator = { check: jest.fn().mockReturnValue({ jwks: { status: 'up' } }) };

		const module: TestingModule = await Test.createTestingModule({
			controllers: [HealthController],
			providers: [
				{ provide: HealthCheckService, useValue: healthCheckService },
				{ provide: TypeOrmHealthIndicator, useValue: dbIndicator },
				{ provide: RedisHealthIndicator, useValue: redisIndicator },
				{ provide: JwksHealthIndicator, useValue: jwksIndicator },
			],
		}).compile();

		controller = module.get<HealthController>(HealthController);
	});

	describe('check', () => {
		it('should call HealthCheckService with all indicators', async () => {
			await controller.check();

			expect(healthCheckService.check).toHaveBeenCalledWith(expect.any(Array));
			expect(dbIndicator.pingCheck).toHaveBeenCalledWith('database', { timeout: 3_000 });
			expect(redisIndicator.check).toHaveBeenCalledWith('redis');
			expect(jwksIndicator.check).toHaveBeenCalledWith('jwks');
		});
	});

	describe('readiness', () => {
		it('should call HealthCheckService with all indicators', async () => {
			await controller.readiness();

			expect(healthCheckService.check).toHaveBeenCalledWith(expect.any(Array));
			expect(dbIndicator.pingCheck).toHaveBeenCalledWith('database', { timeout: 3_000 });
			expect(redisIndicator.check).toHaveBeenCalledWith('redis');
			expect(jwksIndicator.check).toHaveBeenCalledWith('jwks');
		});
	});

	describe('alive', () => {
		it('should return alive status with uptime', () => {
			const result = controller.alive();

			expect(result.status).toBe('alive');
			expect(typeof result.timestamp).toBe('string');
			expect(typeof result.uptime).toBe('number');
		});
	});
});
