import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { JwksService } from './jwks.service';

jest.mock('jwks-rsa', () => {
	const mockGetKeysFn = jest.fn();
	const MockClient = jest.fn().mockImplementation(() => ({ getKeys: mockGetKeysFn }));
	const mockPassport = jest.fn();

	const mod = Object.assign(MockClient, {
		JwksClient: MockClient,
		passportJwtSecret: mockPassport,
		__mockGetKeys: mockGetKeysFn,
		__mockPassportJwtSecret: mockPassport,
	});

	return mod;
});

describe('JwksService', () => {
	let service: JwksService;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let jwksMock: any;

	beforeAll(() => {
		jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
		jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
		jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
	});

	beforeEach(async () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		jwksMock = require('jwks-rsa');
		jwksMock.__mockGetKeys.mockResolvedValue([{ kid: 'key-1' }, { kid: 'key-2' }]);

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				JwksService,
				{
					provide: ConfigService,
					useValue: {
						getOrThrow: jest
							.fn()
							.mockReturnValue('http://auth-service/auth/.well-known/jwks.json'),
					},
				},
			],
		}).compile();

		service = module.get<JwksService>(JwksService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('onModuleInit', () => {
		it('should trigger background key loading without blocking', () => {
			jest.spyOn(service as any, 'loadKeysWithRetry').mockResolvedValue(undefined);

			service.onModuleInit();

			expect((service as any).loadKeysWithRetry).toHaveBeenCalled();
		});
	});

	describe('loadKeysWithRetry', () => {
		it('should set isReady to true when keys load successfully', async () => {
			jwksMock.__mockGetKeys.mockResolvedValue([{ kid: 'key-1' }]);

			await (service as any).loadKeysWithRetry();

			expect(service.isReady).toBe(true);
		});

		it('should leave isReady false when all attempts fail', async () => {
			jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
			jest.spyOn(service as any, 'continueBackgroundRetry').mockResolvedValue(undefined);
			jwksMock.__mockGetKeys.mockRejectedValue(new Error('Network error'));

			await (service as any).loadKeysWithRetry();

			expect(service.isReady).toBe(false);
		});

		it('should set isReady to true when keys succeed after initial failures', async () => {
			jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
			jwksMock.__mockGetKeys
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValue([{ kid: 'key-1' }]);

			await (service as any).loadKeysWithRetry();

			expect(service.isReady).toBe(true);
		});

		it('should leave isReady false and retry when keyset is empty', async () => {
			const sleepSpy = jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
			jest.spyOn(service as any, 'continueBackgroundRetry').mockResolvedValue(undefined);
			jwksMock.__mockGetKeys.mockResolvedValue([]);

			await (service as any).loadKeysWithRetry();

			expect(service.isReady).toBe(false);
			expect(sleepSpy).toHaveBeenCalled();
		});
	});

	describe('isReady', () => {
		it('should be false before keys are loaded', () => {
			expect(service.isReady).toBe(false);
		});
	});

	describe('getSecretProvider', () => {
		it('should return a secret provider function', () => {
			const mockSecretProvider = jest.fn();
			jwksMock.__mockPassportJwtSecret.mockReturnValue(mockSecretProvider);

			const provider = service.getSecretProvider();

			expect(jwksMock.passportJwtSecret).toHaveBeenCalledWith(
				expect.objectContaining({
					jwksUri: 'http://auth-service/auth/.well-known/jwks.json',
					cache: true,
					rateLimit: true,
				})
			);
			expect(provider).toBe(mockSecretProvider);
		});
	});
});
