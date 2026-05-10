import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from '../services/webhooks.service';
import { RolesService } from '../../roles/services/roles.service';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

const makeReq = (sub: string): ExpressRequest & { user: JwtPayload } =>
	({ user: { sub } as JwtPayload }) as ExpressRequest & { user: JwtPayload };

describe('WebhooksController', () => {
	let controller: WebhooksController;
	let webhooksService: jest.Mocked<WebhooksService>;
	let rolesService: jest.Mocked<RolesService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [WebhooksController],
			providers: [
				{
					provide: WebhooksService,
					useValue: {
						register: jest.fn(),
						list: jest.fn(),
						remove: jest.fn(),
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

		controller = module.get<WebhooksController>(WebhooksController);
		webhooksService = module.get(WebhooksService);
		rolesService = module.get(RolesService);
	});

	describe('register', () => {
		it('checks admin role then registers webhook', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const dto = { url: 'https://example.com/hook', events: ['sanction.created'] } as any;
			const webhook = { id: 'w1', ...dto } as any;
			webhooksService.register.mockResolvedValue(webhook);

			const result = await controller.register(dto, makeReq('admin-1'));

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(webhooksService.register).toHaveBeenCalledWith(dto, 'admin-1');
			expect(result).toBe(webhook);
		});

		it('propagates ForbiddenException when not admin', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(controller.register({} as any, makeReq('user-1'))).rejects.toThrow(
				ForbiddenException
			);

			expect(webhooksService.register).not.toHaveBeenCalled();
		});
	});

	describe('list', () => {
		it('checks admin role then returns all webhooks with default pagination', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const webhooks = [{ id: 'w1' }, { id: 'w2' }] as any[];
			webhooksService.list.mockResolvedValue(webhooks);

			const result = await controller.list({}, makeReq('admin-1'));

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(webhooksService.list).toHaveBeenCalledWith({ take: undefined, skip: undefined });
			expect(result).toBe(webhooks);
		});

		it('forwards limit and offset query params to service', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			webhooksService.list.mockResolvedValue([]);

			await controller.list({ limit: 25, offset: 50 }, makeReq('admin-1'));

			expect(webhooksService.list).toHaveBeenCalledWith({ take: 25, skip: 50 });
		});

		it('propagates ForbiddenException when not admin', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(controller.list({}, makeReq('user-1'))).rejects.toThrow(ForbiddenException);

			expect(webhooksService.list).not.toHaveBeenCalled();
		});
	});

	describe('remove', () => {
		it('checks admin role then removes webhook', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			webhooksService.remove.mockResolvedValue(undefined);

			await controller.remove('w1', makeReq('admin-1'));

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(webhooksService.remove).toHaveBeenCalledWith('w1');
		});

		it('propagates NotFoundException when webhook not found', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			webhooksService.remove.mockRejectedValue(new NotFoundException('Webhook not found'));

			await expect(controller.remove('missing', makeReq('admin-1'))).rejects.toThrow(NotFoundException);
		});

		it('propagates ForbiddenException when not admin', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(controller.remove('w1', makeReq('user-1'))).rejects.toThrow(ForbiddenException);

			expect(webhooksService.remove).not.toHaveBeenCalled();
		});
	});
});
