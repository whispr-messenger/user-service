import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { cacheModuleOptionsFactory } from './cache.config';
import KeyvRedis from '@keyv/redis';
import { Logger } from '@nestjs/common';

// Mock KeyvRedis
jest.mock('@keyv/redis');
const MockKeyvRedis = KeyvRedis as unknown as jest.Mock;

describe('cacheModuleOptionsFactory', () => {
	let configService: ConfigService;
	let mockOn: jest.Mock;

	beforeEach(async () => {
		mockOn = jest.fn();

		// Setup mock implementation for KeyvRedis
		MockKeyvRedis.mockImplementation(() => ({
			on: mockOn,
		}));

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn((key: string, defaultValue?: any) => {
							if (key === 'REDIS_URL') return 'redis://localhost:6379/0';
							return defaultValue;
						}),
					},
				},
			],
		}).compile();

		configService = module.get<ConfigService>(ConfigService);
		jest.clearAllMocks();
	});

	it('should create KeyvRedis instance with correct URL and attach error listener', () => {
		const loggerErrorSpy = jest.fn();
		jest.spyOn(Logger.prototype, 'error').mockImplementation(loggerErrorSpy);

		cacheModuleOptionsFactory(configService);

		// Verify KeyvRedis was instantiated
		expect(MockKeyvRedis).toHaveBeenCalledWith('redis://localhost:6379/0');
	});

	it('should use REDIS_URL with credentials when provided', () => {
		const mockConfigService = {
			get: jest.fn((key: string, defaultValue?: any) => {
				if (key === 'REDIS_URL') return 'redis://user:pass@localhost:6379/0';
				return defaultValue;
			}),
		} as unknown as ConfigService;

		cacheModuleOptionsFactory(mockConfigService);
		expect(MockKeyvRedis).toHaveBeenCalledWith('redis://user:pass@localhost:6379/0');
	});

	it('should use default REDIS_URL when not provided', () => {
		const mockConfigService = {
			get: jest.fn((key: string, defaultValue?: any) => {
				return defaultValue;
			}),
		} as unknown as ConfigService;

		cacheModuleOptionsFactory(mockConfigService);
		expect(MockKeyvRedis).toHaveBeenCalledWith('redis://localhost:6379/0');
	});

	it('should attach error listener to keyv instance', () => {
		const loggerErrorSpy = jest.fn();
		jest.spyOn(Logger.prototype, 'error').mockImplementation(loggerErrorSpy);

		cacheModuleOptionsFactory(configService);

		// Verify error listener was attached
		expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));

		// Get the error handler callback and invoke it to test logging
		const errorHandler = mockOn.mock.calls[0][1];
		const testError = new Error('Test connection error');
		errorHandler(testError);

		expect(loggerErrorSpy).toHaveBeenCalledWith('Redis connection error', testError);
	});
});
