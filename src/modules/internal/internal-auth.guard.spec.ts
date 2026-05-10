import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalAuthGuard } from './internal-auth.guard';

const buildContext = (headers: Record<string, string | string[] | undefined>): ExecutionContext =>
	({
		switchToHttp: () => ({
			getRequest: () => ({ headers }),
		}),
	}) as ExecutionContext;

describe('InternalAuthGuard', () => {
	const buildGuard = (token?: string) => {
		const configService = {
			get: jest
				.fn()
				.mockImplementation((key: string) => (key === 'INTERNAL_API_TOKEN' ? token : undefined)),
		} as unknown as ConfigService;
		return new InternalAuthGuard(configService);
	};

	it('allows the request when the header matches the configured token', () => {
		const guard = buildGuard('secret-token');
		const ctx = buildContext({ 'x-internal-token': 'secret-token' });

		expect(guard.canActivate(ctx)).toBe(true);
	});

	it('rejects the request when the header is missing', () => {
		const guard = buildGuard('secret-token');
		const ctx = buildContext({});

		expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
	});

	it('rejects the request when the header does not match', () => {
		const guard = buildGuard('secret-token');
		const ctx = buildContext({ 'x-internal-token': 'wrong-token' });

		expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
	});

	it('rejects when the header has a different length than the expected token', () => {
		const guard = buildGuard('secret-token');
		const ctx = buildContext({ 'x-internal-token': 'short' });

		expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
	});

	it('fails closed when INTERNAL_API_TOKEN is not configured', () => {
		const guard = buildGuard(undefined);
		const ctx = buildContext({ 'x-internal-token': 'anything' });

		expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
	});

	it('uses only the first value when the header is provided as an array', () => {
		const guard = buildGuard('secret-token');
		const ctx = buildContext({ 'x-internal-token': ['secret-token', 'extra'] });

		expect(guard.canActivate(ctx)).toBe(true);
	});
});
