import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { RolesController } from './roles.controller';
import { RolesService } from '../services/roles.service';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { UserRoleEnum } from '../dto/set-role.dto';

const makeReq = (sub: string): ExpressRequest & { user: JwtPayload } =>
	({ user: { sub } as JwtPayload }) as ExpressRequest & { user: JwtPayload };

describe('RolesController', () => {
	let controller: RolesController;
	let service: jest.Mocked<RolesService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [RolesController],
			providers: [
				{
					provide: RolesService,
					useValue: {
						getMyRole: jest.fn(),
						setRole: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<RolesController>(RolesController);
		service = module.get(RolesService);
	});

	describe('getMyRole', () => {
		it('calls service.getMyRole with the authenticated userId', async () => {
			service.getMyRole.mockResolvedValue({ role: 'admin' });

			const result = await controller.getMyRole(makeReq('user-1'));

			expect(result).toEqual({ role: 'admin' });
			expect(service.getMyRole).toHaveBeenCalledWith('user-1');
		});

		it('returns default role "user" when no role assigned', async () => {
			service.getMyRole.mockResolvedValue({ role: 'user' });

			const result = await controller.getMyRole(makeReq('user-2'));

			expect(result).toEqual({ role: 'user' });
		});
	});

	describe('setRole', () => {
		it('calls service.setRole with userId, dto, and adminId', async () => {
			const role = { id: 'r1', userId: 'target-1', role: 'moderator' as const };
			service.setRole.mockResolvedValue(role as any);

			const result = await controller.setRole(
				'target-1',
				{ role: UserRoleEnum.MODERATOR },
				makeReq('admin-1')
			);

			expect(result).toEqual(role);
			expect(service.setRole).toHaveBeenCalledWith(
				'target-1',
				{ role: UserRoleEnum.MODERATOR },
				'admin-1'
			);
		});

		it('propagates NotFoundException when target user not found', async () => {
			service.setRole.mockRejectedValue(new NotFoundException('Target user not found'));

			await expect(
				controller.setRole('missing-id', { role: UserRoleEnum.MODERATOR }, makeReq('admin-1'))
			).rejects.toThrow(NotFoundException);
		});

		it('propagates ForbiddenException when caller is not admin', async () => {
			service.setRole.mockRejectedValue(new ForbiddenException('Admin role required'));

			await expect(
				controller.setRole('target-1', { role: UserRoleEnum.ADMIN }, makeReq('regular-user'))
			).rejects.toThrow(ForbiddenException);
		});
	});
});
