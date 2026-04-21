import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_METADATA_KEY } from './roles.decorator';
import { RolesService } from './services/roles.service';

describe('RolesGuard', () => {
	let guard: RolesGuard;
	let reflector: jest.Mocked<Reflector>;
	let rolesService: jest.Mocked<RolesService>;

	const makeCtx = (userId: string | undefined): ExecutionContext =>
		({
			getHandler: () => ({}) as never,
			getClass: () => ({}) as never,
			switchToHttp: () => ({
				getRequest: () => ({ user: userId ? { sub: userId } : undefined }),
			}),
		}) as unknown as ExecutionContext;

	beforeEach(() => {
		reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
		rolesService = { ensureRole: jest.fn() } as unknown as jest.Mocked<RolesService>;
		guard = new RolesGuard(reflector, rolesService);
	});

	it('allows the request when no @Roles metadata is set', async () => {
		reflector.getAllAndOverride.mockReturnValue(undefined);

		await expect(guard.canActivate(makeCtx('user-1'))).resolves.toBe(true);
		expect(rolesService.ensureRole).not.toHaveBeenCalled();
	});

	it('allows the request when @Roles is set but empty', async () => {
		reflector.getAllAndOverride.mockReturnValue([]);

		await expect(guard.canActivate(makeCtx('user-1'))).resolves.toBe(true);
		expect(rolesService.ensureRole).not.toHaveBeenCalled();
	});

	it('delegates to rolesService.ensureRole with the declared roles', async () => {
		reflector.getAllAndOverride.mockReturnValue(['admin', 'moderator']);
		rolesService.ensureRole.mockResolvedValue(undefined);

		await expect(guard.canActivate(makeCtx('admin-1'))).resolves.toBe(true);
		expect(rolesService.ensureRole).toHaveBeenCalledWith('admin-1', ['admin', 'moderator']);
	});

	it('throws UnauthorizedException when req.user.sub is missing', async () => {
		reflector.getAllAndOverride.mockReturnValue(['admin']);

		await expect(guard.canActivate(makeCtx(undefined))).rejects.toThrow(UnauthorizedException);
		expect(rolesService.ensureRole).not.toHaveBeenCalled();
	});

	it('propagates the ForbiddenException raised by ensureRole', async () => {
		reflector.getAllAndOverride.mockReturnValue(['admin']);
		rolesService.ensureRole.mockRejectedValue(new ForbiddenException('Role required: admin'));

		await expect(guard.canActivate(makeCtx('user-1'))).rejects.toThrow(ForbiddenException);
	});

	it('reads metadata with the expected key from both handler and class', async () => {
		reflector.getAllAndOverride.mockReturnValue(['admin']);
		rolesService.ensureRole.mockResolvedValue(undefined);

		await guard.canActivate(makeCtx('admin-1'));

		expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
			ROLES_METADATA_KEY,
			expect.arrayContaining([expect.anything(), expect.anything()])
		);
	});
});
