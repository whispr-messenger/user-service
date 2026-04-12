import { ForbiddenException } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from './jwt.strategy';

export function assertOwnership(
	req: ExpressRequest & { user?: JwtPayload },
	resourceOwnerId: string,
	forbiddenMessage?: string
): void {
	if (req.user?.sub !== resourceOwnerId) {
		throw new ForbiddenException(forbiddenMessage ?? "Cannot access another user's resources");
	}
}
