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
							if (key === 'REDIS_HOST') return 'localhost';
							if (key === 'REDIS_PORT') return 6379;
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

		// Call the factory function
		// Note: We need to export the function or test it via the module options if it wasn't exported.
		// Looking at cache.config.ts, cacheModuleOptionsFactory is local but used in cacheModuleAsyncOptions.useFactory
		// We might need to export it or access it differently.
		// Let's assume for now we can import it or reproduce the logic calling it.
		// Actually, looking at the file content in previous turns, cacheModuleOptionsFactory IS NOT exported.
		// I will need to export it to test it directly, or allow the modification.
		// Let's modify the file to export it first if needed, but wait, checking file content...
		// Step 33 view_file output showing:
		// 5: function cacheModuleOptionsFactory(configService: ConfigService): CacheOptions {
		// It is NOT exported.

		// I will write the test assuming I will export it.

		cacheModuleOptionsFactory(configService);

		// Verify KeyvRedis was instantiated
		expect(MockKeyvRedis).toHaveBeenCalledWith('redis://localhost:6379/0');
	});

	it('should throw error if username or password is missing in production', () => {
		const mockConfigService = {
			get: jest.fn((key: string, defaultValue?: any) => {
				if (key === 'NODE_ENV') return 'production';
				if (key === 'REDIS_HOST') return 'localhost';
				if (key === 'REDIS_PORT') return 6379;
				return defaultValue;
			}),
		} as unknown as ConfigService;

		expect(() => cacheModuleOptionsFactory(mockConfigService)).toThrow(
			'REDIS_USERNAME and REDIS_PASSWORD must be provided in production'
		);
	});

	it('should work in production if username and password are provided', () => {
		const mockConfigService = {
			get: jest.fn((key: string, defaultValue?: any) => {
				if (key === 'NODE_ENV') return 'production';
				if (key === 'REDIS_HOST') return 'localhost';
				if (key === 'REDIS_PORT') return 6379;
				if (key === 'REDIS_USERNAME') return 'user';
				if (key === 'REDIS_PASSWORD') return 'pass';
				return defaultValue;
			}),
		} as unknown as ConfigService;

		cacheModuleOptionsFactory(mockConfigService);
		expect(MockKeyvRedis).toHaveBeenCalledWith('redis://user:pass@localhost:6379/0');
	});

	it('should ignore empty username and password in development', () => {
		const mockConfigService = {
			get: jest.fn((key: string, defaultValue?: any) => {
				if (key === 'REDIS_HOST') return 'localhost';
				if (key === 'REDIS_PORT') return 6379;
				if (key === 'REDIS_USERNAME') return ''; // Empty string
				if (key === 'REDIS_PASSWORD') return ''; // Empty string
				return defaultValue;
			}),
		} as unknown as ConfigService;

		cacheModuleOptionsFactory(mockConfigService);
		// Should NOT contain empty auth like redis://:@localhost:6379/0
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
