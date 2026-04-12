import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UserRepository } from '../common/repositories/user.repository';
import { User } from '../common/entities/user.entity';

jest.mock('jwks-rsa', () => {
	const mockPassport = jest.fn().mockReturnValue(() => {});
	const MockClient = jest.fn().mockImplementation(() => ({ getKeys: jest.fn() }));
	return Object.assign(MockClient, {
		JwksClient: MockClient,
		passportJwtSecret: mockPassport,
	});
});

// Import after mock so jwks-rsa is already stubbed
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { JwtStrategy } = require('./jwt.strategy');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { JwksService } = require('./jwks.service');

import type { JwtPayload } from './jwt.strategy';

describe('JwtStrategy', () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let strategy: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let module: any;
	let userRepository: jest.Mocked<Pick<UserRepository, 'findById'>>;

	const mockUser: Partial<User> = {
		id: 'user-uuid-123',
		phoneNumber: '+33612345678',
		isActive: true,
	};

	beforeEach(async () => {
		userRepository = {
			findById: jest.fn(),
		};

		module = await Test.createTestingModule({
			providers: [
				JwtStrategy,
				{
					provide: JwksService,
					useValue: {
						getSecretProvider: jest.fn().mockReturnValue(() => {}),
					},
				},
				{
					provide: ConfigService,
					useValue: {
						getOrThrow: jest.fn((key: string) => {
							const config: Record<string, string> = {
								JWT_ISSUER: 'https://auth.whispr.test',
								JWT_AUDIENCE: 'whispr-user-service',
							};
							return config[key];
						}),
					},
				},
				{
					provide: UserRepository,
					useValue: userRepository,
				},
			],
		}).compile();

		strategy = module.get(JwtStrategy);
		// keep module reference for constructor tests
	});

	const validPayload: JwtPayload = {
		sub: 'user-uuid-123',
		iat: 1700000000,
		exp: 1700003600,
	};

	describe('constructor', () => {
		it('should call ConfigService.getOrThrow for JWT_ISSUER and JWT_AUDIENCE', () => {
			const configService = module.get(ConfigService);
			expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_ISSUER');
			expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_AUDIENCE');
		});
	});

	describe('validate', () => {
		it('should return the payload when user exists and is active', async () => {
			userRepository.findById.mockResolvedValue(mockUser as User);

			const result = await strategy.validate(validPayload);

			expect(result).toEqual(validPayload);
			expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-123');
		});

		it('should throw UnauthorizedException when user is not found', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
		});

		it('should throw UnauthorizedException when user is inactive', async () => {
			userRepository.findById.mockResolvedValue({
				...mockUser,
				isActive: false,
			} as User);

			await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
		});
	});
});
