import { Test, TestingModule } from '@nestjs/testing';
import { JwksHealthIndicator } from './jwks-health.indicator';
import { JwksService } from './jwks.service';
import { HealthIndicatorService } from '@nestjs/terminus';

jest.mock('jwks-rsa', () => {
	const mockGetKeysFn = jest.fn();
	const MockClient = jest.fn().mockImplementation(() => ({ getKeys: mockGetKeysFn }));
	const mockPassport = jest.fn();
	return Object.assign(MockClient, {
		JwksClient: MockClient,
		passportJwtSecret: mockPassport,
	});
});

describe('JwksHealthIndicator', () => {
	let indicator: JwksHealthIndicator;
	let jwksService: { isReady: boolean };
	let mockUp: jest.Mock;
	let mockDown: jest.Mock;

	beforeEach(async () => {
		mockUp = jest.fn().mockReturnValue({ jwks: { status: 'up' } });
		mockDown = jest.fn().mockImplementation((data) => ({ jwks: { status: 'down', ...data } }));

		jwksService = { isReady: false };

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				JwksHealthIndicator,
				{
					provide: HealthIndicatorService,
					useValue: { check: jest.fn().mockReturnValue({ up: mockUp, down: mockDown }) },
				},
				{ provide: JwksService, useValue: jwksService },
			],
		}).compile();

		indicator = module.get<JwksHealthIndicator>(JwksHealthIndicator);
	});

	it('should report down when JWKS keys are not loaded', () => {
		jwksService.isReady = false;

		const result = indicator.check('jwks');

		expect(result).toEqual(expect.objectContaining({ jwks: expect.objectContaining({ status: 'down' }) }));
		expect(mockDown).toHaveBeenCalledWith({ message: 'JWKS keys not loaded' });
	});

	it('should report up when JWKS keys are loaded', () => {
		jwksService.isReady = true;

		const result = indicator.check('jwks');

		expect(result).toEqual({ jwks: { status: 'up' } });
		expect(mockUp).toHaveBeenCalled();
	});
});
