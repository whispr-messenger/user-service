import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import { ServiceUnavailableException, Logger } from '@nestjs/common';
import { CacheService } from '../cache';
import { RedisConfig } from '../../config/redis.config';
import { JwksHealthIndicator } from '../jwt-auth/jwks-health.indicator';

// jwks-rsa uses ESM (jose) which Jest cannot parse without a transform.
// Mocking it here prevents the transitive import from failing at parse time.
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
	let dataSource: DataSource;
	let cacheService: any;
	let redisConfig: any;
	let jwksHealthIndicator: any;

	beforeAll(() => {
		jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
		jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
		jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
		jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
		jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {});
	});

	beforeEach(async () => {
		const mockHealth = { isHealthy: true, lastError: null as Error | null };

		const module: TestingModule = await Test.createTestingModule({
			controllers: [HealthController],
			providers: [
				{
					provide: DataSource,
					useValue: {
						query: jest.fn(),
					},
				},
				{
					provide: CacheService,
					useValue: {
						set: jest.fn(),
						get: jest.fn(),
					},
				},
				{
					provide: RedisConfig,
					useValue: {
						health: mockHealth,
					},
				},
				{
					provide: JwksHealthIndicator,
					useValue: {
						check: jest.fn().mockReturnValue({ jwks: { status: 'up' } }),
					},
				},
			],
		}).compile();

		controller = module.get<HealthController>(HealthController);
		dataSource = module.get<DataSource>(DataSource);
		cacheService = module.get(CacheService);
		redisConfig = module.get(RedisConfig);
		jwksHealthIndicator = module.get(JwksHealthIndicator);

		redisConfig.health.isHealthy = true;
		redisConfig.health.lastError = null;
	});

	describe('check', () => {
		it('should return health status 200 when all services are healthy', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			cacheService.set.mockResolvedValue(undefined);
			cacheService.get.mockResolvedValue('ok');

			const result = await controller.check();

			expect(result.status).toBe('ok');
			expect(result.services.database).toBe('healthy');
			expect(result.services.cache).toBe('healthy');
		});

		it('should throw ServiceUnavailableException when database is unhealthy', async () => {
			(dataSource.query as jest.Mock).mockRejectedValue(new Error('DB Error'));
			cacheService.set.mockResolvedValue(undefined);
			cacheService.get.mockResolvedValue('ok');

			await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
		});

		it('should throw ServiceUnavailableException when cache is unhealthy (tracker)', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			redisConfig.health.isHealthy = false;
			redisConfig.health.lastError = new Error('Redis Error');

			await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
		});

		it('should throw ServiceUnavailableException when cache operation fails', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			cacheService.set.mockRejectedValue(new Error('Cache Error'));

			await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
		});
	});

	describe('readiness', () => {
		it('should return ready when all services are healthy and JWKS is loaded', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			cacheService.set.mockResolvedValue(undefined);
			cacheService.get.mockResolvedValue('ok');
			jwksHealthIndicator.check.mockReturnValue({ jwks: { status: 'up' } });

			const result = await controller.readiness();

			expect(result.status).toBe('ready');
		});

		it('should throw ServiceUnavailableException when database is unhealthy', async () => {
			(dataSource.query as jest.Mock).mockRejectedValue(new Error('DB Error'));

			await expect(controller.readiness()).rejects.toThrow(ServiceUnavailableException);
		});

		it('should throw ServiceUnavailableException when cache is unhealthy', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			redisConfig.health.isHealthy = false;
			redisConfig.health.lastError = new Error('Redis Error');

			await expect(controller.readiness()).rejects.toThrow(ServiceUnavailableException);
		});

		it('should throw ServiceUnavailableException when JWKS keys are not loaded', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			cacheService.set.mockResolvedValue(undefined);
			cacheService.get.mockResolvedValue('ok');
			jwksHealthIndicator.check.mockReturnValue({ jwks: { status: 'down' } });

			await expect(controller.readiness()).rejects.toThrow(ServiceUnavailableException);
		});
	});

	describe('alive', () => {
		it('should return alive status with uptime and memory info', () => {
			const result = controller.alive();

			expect(result.status).toBe('alive');
			expect(typeof result.timestamp).toBe('string');
			expect(typeof result.uptime).toBe('number');
			expect(result.memory).toBeDefined();
		});
	});

	describe('check — missing branches', () => {
		it('should mark cache as unhealthy when get returns unexpected value', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			cacheService.set.mockResolvedValue(undefined);
			cacheService.get.mockResolvedValue('unexpected');

			await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
		});
	});
});
