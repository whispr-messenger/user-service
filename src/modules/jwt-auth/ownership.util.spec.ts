import { ForbiddenException } from '@nestjs/common';
import { assertOwnership } from './ownership.util';

describe('assertOwnership', () => {
	const makeReq = (sub?: string) => ({ user: sub ? { sub } : undefined }) as any;

	it('does not throw when sub matches resourceOwnerId', () => {
		expect(() => assertOwnership(makeReq('user-1'), 'user-1')).not.toThrow();
	});

	it('throws ForbiddenException when sub differs from resourceOwnerId', () => {
		expect(() => assertOwnership(makeReq('user-1'), 'user-2')).toThrow(ForbiddenException);
	});

	it('throws ForbiddenException when user is undefined', () => {
		expect(() => assertOwnership({ user: undefined } as any, 'user-1')).toThrow(ForbiddenException);
	});
});
