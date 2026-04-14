import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { SanctionsController } from './sanctions.controller';
import { SanctionsService } from '../services/sanctions.service';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { UserSanction } from '../entities/user-sanction.entity';

const makeReq = (sub: string): ExpressRequest & { user: JwtPayload } =>
	({ user: { sub } as JwtPayload }) as ExpressRequest & { user: JwtPayload };

describe('SanctionsController', () => {
	let controller: SanctionsController;
	let service: jest.Mocked<SanctionsService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [SanctionsController],
			providers: [
				{
					provide: SanctionsService,
					useValue: {
						createSanction: jest.fn(),
						findFiltered: jest.fn(),
						getMySanctions: jest.fn(),
						getSanction: jest.fn(),
						liftSanction: jest.fn(),
						getStats: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<SanctionsController>(SanctionsController);
		service = module.get(SanctionsService);
	});

	describe('createSanction', () => {
		it('calls service.createSanction with dto and issuer id', async () => {
			const dto = { userId: 'u1', type: 'warning', reason: 'spam' } as any;
			const sanction = { id: 's1', ...dto } as UserSanction;
			service.createSanction.mockResolvedValue(sanction);

			const result = await controller.createSanction(dto, makeReq('admin-1'));

			expect(result).toBe(sanction);
			expect(service.createSanction).toHaveBeenCalledWith(dto, 'admin-1');
		});

		it('propagates ForbiddenException when not admin', async () => {
			service.createSanction.mockRejectedValue(new ForbiddenException());

			await expect(controller.createSanction({} as any, makeReq('user-1'))).rejects.toThrow(
				ForbiddenException
			);
		});

		it('propagates NotFoundException when target user not found', async () => {
			service.createSanction.mockRejectedValue(new NotFoundException('User not found'));

			await expect(
				controller.createSanction({ userId: 'missing' } as any, makeReq('admin-1'))
			).rejects.toThrow(NotFoundException);
		});
	});

	describe('listAll', () => {
		it('calls service.findFiltered with adminId and query params', async () => {
			const sanctions = [{ id: 's1' }] as UserSanction[];
			service.findFiltered.mockResolvedValue(sanctions);
			const query = { type: 'warning' } as any;

			const result = await controller.listAll(query, makeReq('admin-1'));

			expect(result).toBe(sanctions);
			expect(service.findFiltered).toHaveBeenCalledWith('admin-1', query);
		});

		it('propagates ForbiddenException when not admin', async () => {
			service.findFiltered.mockRejectedValue(new ForbiddenException());

			await expect(controller.listAll({} as any, makeReq('user-1'))).rejects.toThrow(
				ForbiddenException
			);
		});
	});

	describe('getMySanctions', () => {
		it('calls service.getMySanctions with the authenticated userId', async () => {
			const sanctions = [{ id: 's1' }] as UserSanction[];
			service.getMySanctions.mockResolvedValue(sanctions);

			const result = await controller.getMySanctions(makeReq('user-1'));

			expect(result).toBe(sanctions);
			expect(service.getMySanctions).toHaveBeenCalledWith('user-1');
		});
	});

	describe('getSanction', () => {
		it('calls service.getSanction with the sanction id', async () => {
			const sanction = { id: 's1' } as UserSanction;
			service.getSanction.mockResolvedValue(sanction);

			const result = await controller.getSanction('s1');

			expect(result).toBe(sanction);
			expect(service.getSanction).toHaveBeenCalledWith('s1');
		});

		it('propagates NotFoundException when sanction not found', async () => {
			service.getSanction.mockRejectedValue(new NotFoundException('Sanction not found'));

			await expect(controller.getSanction('missing')).rejects.toThrow(NotFoundException);
		});
	});

	describe('liftSanction', () => {
		it('calls service.liftSanction with id and adminId', async () => {
			const sanction = { id: 's1', active: false } as UserSanction;
			service.liftSanction.mockResolvedValue(sanction);

			const result = await controller.liftSanction('s1', makeReq('admin-1'));

			expect(result).toBe(sanction);
			expect(service.liftSanction).toHaveBeenCalledWith('s1', 'admin-1');
		});

		it('propagates ConflictException when already lifted', async () => {
			service.liftSanction.mockRejectedValue(new ConflictException('Already lifted'));

			await expect(controller.liftSanction('s1', makeReq('admin-1'))).rejects.toThrow(
				ConflictException
			);
		});

		it('propagates ForbiddenException when not admin', async () => {
			service.liftSanction.mockRejectedValue(new ForbiddenException());

			await expect(controller.liftSanction('s1', makeReq('user-1'))).rejects.toThrow(
				ForbiddenException
			);
		});
	});

	describe('getStats', () => {
		it('calls service.getStats with the adminId', async () => {
			const stats = [{ type: 'warning', count: 5 }];
			service.getStats.mockResolvedValue(stats);

			const result = await controller.getStats(makeReq('admin-1'));

			expect(result).toBe(stats);
			expect(service.getStats).toHaveBeenCalledWith('admin-1');
		});

		it('propagates ForbiddenException when not admin', async () => {
			service.getStats.mockRejectedValue(new ForbiddenException());

			await expect(controller.getStats(makeReq('user-1'))).rejects.toThrow(ForbiddenException);
		});
	});
});
