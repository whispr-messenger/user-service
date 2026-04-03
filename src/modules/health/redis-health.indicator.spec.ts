import { Test, TestingModule } from '@nestjs/testing';
import { RedisHealthIndicator } from './redis-health.indicator';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisConfig } from '../../config/redis.config';

describe('RedisHealthIndicator', () => {
	let indicator: RedisHealthIndicator;
	let mockRedisConfig: {
		health: { isHealthy: boolean; lastError: Error | null };
		getClient: jest.Mock;
	};
	let mockUp: jest.Mock;
	let mockDown: jest.Mock;

	beforeEach(async () => {
		mockUp = jest.fn().mockReturnValue({ redis: { status: 'up' } });
		mockDown = jest.fn().mockImplementation((data) => ({ redis: { status: 'down', ...data } }));

		const mockHealthIndicatorService = {
			check: jest.fn().mockReturnValue({ up: mockUp, down: mockDown }),
		};

		mockRedisConfig = {
			health: { isHealthy: true, lastError: null },
			getClient: jest.fn().mockReturnValue({
				ping: jest.fn().mockResolvedValue('PONG'),
			}),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RedisHealthIndicator,
				{ provide: HealthIndicatorService, useValue: mockHealthIndicatorService },
				{ provide: RedisConfig, useValue: mockRedisConfig },
			],
		}).compile();

		indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
	});

	it('should return up when Redis is healthy and ping succeeds', async () => {
		const result = await indicator.check('redis');

		expect(result).toEqual({ redis: { status: 'up' } });
		expect(mockUp).toHaveBeenCalled();
	});

	it('should return down when Redis health tracker reports unhealthy', async () => {
		mockRedisConfig.health.isHealthy = false;
		mockRedisConfig.health.lastError = new Error('Connection refused');

		const result = await indicator.check('redis');

		expect(result).toEqual(
			expect.objectContaining({ redis: expect.objectContaining({ status: 'down' }) })
		);
		expect(mockDown).toHaveBeenCalledWith({ message: 'Connection refused' });
	});

	it('should return down when Redis health is unhealthy with no error', async () => {
		mockRedisConfig.health.isHealthy = false;
		mockRedisConfig.health.lastError = null;

		await indicator.check('redis');

		expect(mockDown).toHaveBeenCalledWith({ message: 'Redis connection is unhealthy' });
	});

	it('should return down when ping throws an error', async () => {
		mockRedisConfig.getClient.mockReturnValue({
			ping: jest.fn().mockRejectedValue(new Error('ECONNRESET')),
		});

		await indicator.check('redis');

		expect(mockDown).toHaveBeenCalledWith({ message: 'ECONNRESET' });
	});

	it('should return down when ping returns unexpected response', async () => {
		mockRedisConfig.getClient.mockReturnValue({
			ping: jest.fn().mockResolvedValue('WRONG'),
		});

		await indicator.check('redis');

		expect(mockDown).toHaveBeenCalledWith({ message: 'Unexpected ping response: WRONG' });
	});
});
