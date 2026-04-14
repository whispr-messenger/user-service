import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ReputationController } from './reputation.controller';
import { ReputationService } from '../services/reputation.service';
import { RolesService } from '../../roles/services/roles.service';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

const makeReq = (sub: string): ExpressRequest & { user: JwtPayload } =>
	({ user: { sub } as JwtPayload }) as ExpressRequest & { user: JwtPayload };

describe('ReputationController', () => {
	let controller: ReputationController;
	let reputationService: jest.Mocked<ReputationService>;
	let rolesService: jest.Mocked<RolesService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [ReputationController],
			providers: [
				{
					provide: ReputationService,
					useValue: {
						getReputation: jest.fn(),
					},
				},
				{
					provide: RolesService,
					useValue: {
						ensureAdminOrModerator: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<ReputationController>(ReputationController);
		reputationService = module.get(ReputationService);
		rolesService = module.get(RolesService);
	});

	describe('getMyReputation', () => {
		it('calls reputationService.getReputation with the authenticated userId', async () => {
			const rep = { userId: 'user-1', score: 100 } as any;
			reputationService.getReputation.mockResolvedValue(rep);

			const result = await controller.getMyReputation(makeReq('user-1'));

			expect(result).toBe(rep);
			expect(reputationService.getReputation).toHaveBeenCalledWith('user-1');
		});
	});

	describe('getUserReputation', () => {
		it('checks admin role then returns reputation for target user', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const rep = { userId: 'target-1', score: 75 } as any;
			reputationService.getReputation.mockResolvedValue(rep);

			const result = await controller.getUserReputation('target-1', makeReq('admin-1'));

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(reputationService.getReputation).toHaveBeenCalledWith('target-1');
			expect(result).toBe(rep);
		});

		it('propagates ForbiddenException when not admin or moderator', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(
				new ForbiddenException('Admin or moderator role required')
			);

			await expect(controller.getUserReputation('target-1', makeReq('user-1'))).rejects.toThrow(
				ForbiddenException
			);

			expect(reputationService.getReputation).not.toHaveBeenCalled();
		});
	});
});
