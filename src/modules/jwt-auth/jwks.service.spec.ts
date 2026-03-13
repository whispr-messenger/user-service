import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { JwksService } from './jwks.service';
jest.mock('jwks-rsa', () => {
	const mockGetKeys = jest.fn();
	const mockPassportJwtSecret = jest.fn();

	const MockJwksClient = jest.fn().mockImplementation(() => ({
		getKeys: mockGetKeys,
	}));

	return {
		__esModule: true,
		default: Object.assign(MockJwksClient, {
			JwksClient: MockJwksClient,
			passportJwtSecret: mockPassportJwtSecret,
		}),
		JwksClient: MockJwksClient,
		passportJwtSecret: mockPassportJwtSecret,
	};
});

describe('JwksService', () => {
	let service: JwksService;
	let mockGetKeys: jest.Mock;
	let mockPassportJwtSecret: jest.Mock;

	beforeAll(() => {
		jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
		jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
		jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
	});

	beforeEach(async () => {
		const jwksRsaModule = jest.requireMock('jwks-rsa') as {
			default: jest.Mock & { passportJwtSecret: jest.Mock };
			passportJwtSecret: jest.Mock;
		};
		mockGetKeys = new (jwksRsaModule.default as unknown as new () => { getKeys: jest.Mock })().getKeys;
		mockPassportJwtSecret = jwksRsaModule.passportJwtSecret;

		mockGetKeys.mockResolvedValue([{ kid: 'key-1' }, { kid: 'key-2' }]);

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
		it('should load JWKS keys at startup', async () => {
			mockGetKeys.mockResolvedValue([{ kid: 'key-1' }]);

			await service.onModuleInit();

			expect(mockGetKeys).toHaveBeenCalled();
		});

		it('should log error when JWKS fetch fails at startup', async () => {
			mockGetKeys.mockRejectedValue(new Error('Network error'));

			await expect(service.onModuleInit()).resolves.not.toThrow();
		});
	});

	describe('getSecretProvider', () => {
		it('should return a secret provider function', () => {
			const mockSecretProvider = jest.fn();
			mockPassportJwtSecret.mockReturnValue(mockSecretProvider);

			const provider = service.getSecretProvider();

			expect(mockPassportJwtSecret).toHaveBeenCalledWith(
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
