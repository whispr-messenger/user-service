import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

// Mock AuthGuard base so tests don't require Passport setup
jest.mock('@nestjs/passport', () => ({
	AuthGuard: jest.fn().mockReturnValue(
		class MockAuthGuard {
			canActivate(_ctx: ExecutionContext) {
				return true;
			}
		}
	),
}));

function makeContext(type: string): ExecutionContext {
	return {
		getType: jest.fn().mockReturnValue(type),
		getHandler: jest.fn().mockReturnValue(function handler() {}),
		getClass: jest.fn().mockReturnValue(class TestController {}),
	} as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
	let guard: JwtAuthGuard;
	let reflector: Reflector;

	beforeEach(() => {
		reflector = new Reflector();
		guard = new JwtAuthGuard(reflector);
	});

	it('should allow microservice (non-http) contexts without JWT validation', () => {
		const context = makeContext('rpc');
		expect(guard.canActivate(context)).toBe(true);
	});

	it('should allow requests marked with @Public()', () => {
		const context = makeContext('http');
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

		const result = guard.canActivate(context);

		expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
		expect(result).toBe(true);
	});

	it('should call super.canActivate for protected HTTP routes', () => {
		const context = makeContext('http');
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

		const result = guard.canActivate(context);

		expect(result).toBe(true);
	});

	it('should not call reflector for non-http contexts', () => {
		const context = makeContext('ws');
		jest.spyOn(reflector, 'getAllAndOverride');

		guard.canActivate(context);

		expect(reflector.getAllAndOverride).not.toHaveBeenCalled();
	});
});
