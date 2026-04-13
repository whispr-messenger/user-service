import { ExecutionContext } from '@nestjs/common';
import { HttpThrottlerGuard } from './http-throttler.guard';

describe('HttpThrottlerGuard', () => {
	let guard: HttpThrottlerGuard;

	beforeEach(() => {
		guard = Object.create(HttpThrottlerGuard.prototype);
	});

	describe('shouldSkip', () => {
		it('should skip non-http contexts', async () => {
			const context = { getType: () => 'rpc' } as unknown as ExecutionContext;

			const result = await guard['shouldSkip'](context);

			expect(result).toBe(true);
		});

		it('should not skip http contexts', async () => {
			const context = { getType: () => 'http' } as unknown as ExecutionContext;

			// Mock the parent shouldSkip to return false (default behavior)
			jest.spyOn(Object.getPrototypeOf(HttpThrottlerGuard.prototype), 'shouldSkip').mockResolvedValue(
				false
			);

			const result = await guard['shouldSkip'](context);

			expect(result).toBe(false);
		});
	});
});
