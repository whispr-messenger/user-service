import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import { ServiceUnavailableException, Logger } from '@nestjs/common';
import { CacheService } from '../cache';
import { RedisConfig } from '../config/redis.config';

describe('HealthController', () => {
	let controller: HealthController;
	let dataSource: DataSource;
	let cacheService: any;
	let redisConfig: any;

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
			],
		}).compile();

		controller = module.get<HealthController>(HealthController);
		dataSource = module.get<DataSource>(DataSource);
		cacheService = module.get(CacheService);
		redisConfig = module.get(RedisConfig);

		// Reset health before each test
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
		it('should return ready when all services are healthy', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			cacheService.set.mockResolvedValue(undefined);
			cacheService.get.mockResolvedValue('ok');

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
	});
});
