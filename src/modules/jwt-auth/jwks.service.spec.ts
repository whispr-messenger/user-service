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
		it('should load JWKS keys at startup and set isReady to true', async () => {
			jwksMock.__mockGetKeys.mockResolvedValue([{ kid: 'key-1' }]);

			await service.onModuleInit();

			expect(jwksMock.__mockGetKeys).toHaveBeenCalled();
			expect(service.isReady).toBe(true);
		});

		it('should leave isReady false when JWKS fetch fails on all attempts', async () => {
			jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
			jwksMock.__mockGetKeys.mockRejectedValue(new Error('Network error'));

			await expect(service.onModuleInit()).resolves.not.toThrow();

			expect(service.isReady).toBe(false);
		});

		it('should set isReady to true when JWKS succeeds after initial failures', async () => {
			jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
			jwksMock.__mockGetKeys
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValue([{ kid: 'key-1' }]);

			await service.onModuleInit();

			expect(service.isReady).toBe(true);
		});
	});

	describe('isReady', () => {
		it('should be false before onModuleInit is called', () => {
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
