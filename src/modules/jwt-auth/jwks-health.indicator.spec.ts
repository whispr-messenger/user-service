import { Test, TestingModule } from '@nestjs/testing';
import { JwksHealthIndicator } from './jwks-health.indicator';
import { JwksService } from './jwks.service';

// jwks-rsa uses ESM (jose) which Jest cannot parse without a transform.
// Mocking it here prevents the transitive import from failing at parse time.
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

	beforeEach(async () => {
		jwksService = { isReady: false };

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				JwksHealthIndicator,
				{
					provide: JwksService,
					useValue: jwksService,
				},
			],
		}).compile();

		indicator = module.get<JwksHealthIndicator>(JwksHealthIndicator);
	});

	it('should report down when JWKS keys are not loaded', () => {
		jwksService.isReady = false;

		const result = indicator.check();

		expect(result.jwks.status).toBe('down');
	});

	it('should report up when JWKS keys are loaded', () => {
		jwksService.isReady = true;

		const result = indicator.check();

		expect(result.jwks.status).toBe('up');
	});
});
