import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

const INTERNAL_TOKEN_HEADER = 'x-internal-token';

@Injectable()
export class InternalAuthGuard implements CanActivate {
	constructor(private readonly configService: ConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const expected = this.configService.get<string>('INTERNAL_API_TOKEN');
		if (!expected) {
			throw new UnauthorizedException('Internal API not configured');
		}

		const req = context.switchToHttp().getRequest<Request>();
		const headerValue = req.headers[INTERNAL_TOKEN_HEADER];
		const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;

		if (!provided || !this.constantTimeEqual(provided, expected)) {
			throw new UnauthorizedException('Invalid internal token');
		}

		return true;
	}

	private constantTimeEqual(a: string, b: string): boolean {
		const bufA = Buffer.from(a);
		const bufB = Buffer.from(b);
		if (bufA.length !== bufB.length) {
			return false;
		}
		return timingSafeEqual(bufA, bufB);
	}
}
