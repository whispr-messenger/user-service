import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ServiceUnavailableException, Logger } from '@nestjs/common';
import { cacheHealth } from '../cache.config';

describe('HealthController', () => {
	let controller: HealthController;
	let dataSource: DataSource;
	let cacheManager: any;

	beforeAll(() => {
		jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
		jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
		jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
		jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
		jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {});
	});

	beforeEach(async () => {
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
					provide: CACHE_MANAGER,
					useValue: {
						set: jest.fn(),
						get: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<HealthController>(HealthController);
		dataSource = module.get<DataSource>(DataSource);
		cacheManager = module.get(CACHE_MANAGER);

		// Reset cache health before each test
		cacheHealth.isHealthy = true;
		cacheHealth.lastError = null;
	});

	describe('check', () => {
		it('should return health status 200 when all services are healthy', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			cacheManager.set.mockResolvedValue(undefined);
			cacheManager.get.mockResolvedValue('ok');

			const result = await controller.check();

			expect(result.status).toBe('ok');
			expect(result.services.database).toBe('healthy');
			expect(result.services.cache).toBe('healthy');
		});

		it('should throw ServiceUnavailableException when database is unhealthy', async () => {
			(dataSource.query as jest.Mock).mockRejectedValue(new Error('DB Error'));
			cacheManager.set.mockResolvedValue(undefined);
			cacheManager.get.mockResolvedValue('ok');

			await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
		});

		it('should throw ServiceUnavailableException when cache is unhealthy (tracker)', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			cacheHealth.isHealthy = false;
			cacheHealth.lastError = new Error('Redis Error');

			await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
		});

		it('should throw ServiceUnavailableException when cache operation fails', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			cacheManager.set.mockRejectedValue(new Error('Cache Error'));

			await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
		});
	});

	describe('readiness', () => {
		it('should return ready when all services are healthy', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			cacheManager.set.mockResolvedValue(undefined);
			cacheManager.get.mockResolvedValue('ok');

			const result = await controller.readiness();

			expect(result.status).toBe('ready');
		});

		it('should throw ServiceUnavailableException when database is unhealthy', async () => {
			(dataSource.query as jest.Mock).mockRejectedValue(new Error('DB Error'));

			await expect(controller.readiness()).rejects.toThrow(ServiceUnavailableException);
		});

		it('should throw ServiceUnavailableException when cache is unhealthy', async () => {
			(dataSource.query as jest.Mock).mockResolvedValue([{ 1: 1 }]);
			cacheHealth.isHealthy = false;
			cacheHealth.lastError = new Error('Redis Error');

			await expect(controller.readiness()).rejects.toThrow(ServiceUnavailableException);
		});
	});
});
