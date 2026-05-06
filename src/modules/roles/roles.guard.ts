import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_METADATA_KEY, AllowedRole } from './roles.decorator';
import { RolesService } from './services/roles.service';

/**
 * Enforces `@Roles(...)` metadata on controller methods (or classes).
 * Defense-in-depth on top of the service-level `ensureAdmin*` calls — rejects
 * requests at the HTTP layer before any business code runs (WHISPR-1027).
 *
 * Handlers without `@Roles(...)` metadata are allowed through (the global
 * JwtAuthGuard still guarantees they're authenticated).
 */
@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly rolesService: RolesService
	) {}

	async canActivate(ctx: ExecutionContext): Promise<boolean> {
		const requiredRoles = this.reflector.getAllAndOverride<AllowedRole[] | undefined>(
			ROLES_METADATA_KEY,
			[ctx.getHandler(), ctx.getClass()]
		);
		if (!requiredRoles || requiredRoles.length === 0) {
			return true;
		}

		const req = ctx.switchToHttp().getRequest<{ user?: { sub?: string } }>();
		const userId = req.user?.sub;
		if (!userId) {
			throw new UnauthorizedException('Missing authenticated user');
		}

		await this.rolesService.ensureRole(userId, requiredRoles);
		return true;
	}
}
