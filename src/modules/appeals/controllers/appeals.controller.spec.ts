import { Test, TestingModule } from '@nestjs/testing';
import {
	NotFoundException,
	ForbiddenException,
	ConflictException,
	BadRequestException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AppealsController } from './appeals.controller';
import { AppealsService } from '../services/appeals.service';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { Appeal } from '../entities/appeal.entity';
import { RolesGuard } from '../../roles/roles.guard';

const makeReq = (sub: string): ExpressRequest & { user: JwtPayload } =>
	({ user: { sub } as JwtPayload }) as ExpressRequest & { user: JwtPayload };

describe('AppealsController', () => {
	let controller: AppealsController;
	let service: jest.Mocked<AppealsService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AppealsController],
			providers: [
				{
					provide: AppealsService,
					useValue: {
						createAppeal: jest.fn(),
						getMyAppeals: jest.fn(),
						getAppealQueue: jest.fn(),
						getAppeal: jest.fn(),
						reviewAppeal: jest.fn(),
						findFiltered: jest.fn(),
						getStats: jest.fn(),
						getTimeline: jest.fn(),
					},
				},
			],
		})
			.overrideGuard(RolesGuard)
			.useValue({ canActivate: () => true })
			.compile();

		controller = module.get<AppealsController>(AppealsController);
		service = module.get(AppealsService);
	});

	describe('createAppeal', () => {
		it('calls service.createAppeal with dto and userId', async () => {
			const dto = { sanctionId: 's1', reason: 'unfair' } as any;
			const appeal = { id: 'a1', ...dto } as Appeal;
			service.createAppeal.mockResolvedValue(appeal);

			const result = await controller.createAppeal(dto, makeReq('user-1'));

			expect(result).toBe(appeal);
			expect(service.createAppeal).toHaveBeenCalledWith(dto, 'user-1');
		});

		it('propagates ConflictException when appeal already exists', async () => {
			service.createAppeal.mockRejectedValue(new ConflictException());

			await expect(controller.createAppeal({} as any, makeReq('user-1'))).rejects.toThrow(
				ConflictException
			);
		});

		it('propagates BadRequestException when max appeals reached', async () => {
			service.createAppeal.mockRejectedValue(new BadRequestException());

			await expect(controller.createAppeal({} as any, makeReq('user-1'))).rejects.toThrow(
				BadRequestException
			);
		});
	});

	describe('getMyAppeals', () => {
		it('calls service.getMyAppeals with the authenticated userId', async () => {
			const appeals = [{ id: 'a1' }] as Appeal[];
			service.getMyAppeals.mockResolvedValue(appeals);

			const result = await controller.getMyAppeals(makeReq('user-1'));

			expect(result).toBe(appeals);
			expect(service.getMyAppeals).toHaveBeenCalledWith('user-1');
		});
	});

	describe('getAppealQueue', () => {
		it('calls service.getAppealQueue with defaults when no query params', async () => {
			const appeals = [{ id: 'a1' }] as Appeal[];
			service.getAppealQueue.mockResolvedValue(appeals);

			const result = await controller.getAppealQueue(
				undefined as any,
				undefined as any,
				makeReq('admin-1')
			);

			expect(result).toBe(appeals);
			expect(service.getAppealQueue).toHaveBeenCalledWith('admin-1', 50, 0);
		});

		it('parses limit and offset from query strings', async () => {
			service.getAppealQueue.mockResolvedValue([]);

			await controller.getAppealQueue('10', '5', makeReq('admin-1'));

			expect(service.getAppealQueue).toHaveBeenCalledWith('admin-1', 10, 5);
		});

		it('propagates ForbiddenException when not admin', async () => {
			service.getAppealQueue.mockRejectedValue(new ForbiddenException());

			await expect(
				controller.getAppealQueue(undefined as any, undefined as any, makeReq('user-1'))
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe('getAppeal', () => {
		it('calls service.getAppeal with the appeal id', async () => {
			const appeal = { id: 'a1' } as Appeal;
			service.getAppeal.mockResolvedValue(appeal);

			const result = await controller.getAppeal('a1');

			expect(result).toBe(appeal);
			expect(service.getAppeal).toHaveBeenCalledWith('a1');
		});

		it('propagates NotFoundException when appeal not found', async () => {
			service.getAppeal.mockRejectedValue(new NotFoundException());

			await expect(controller.getAppeal('missing')).rejects.toThrow(NotFoundException);
		});
	});

	describe('reviewAppeal', () => {
		it('calls service.reviewAppeal with id, adminId, and dto', async () => {
			const dto = { decision: 'accepted', notes: 'valid' } as any;
			const appeal = { id: 'a1', status: 'accepted' } as Appeal;
			service.reviewAppeal.mockResolvedValue(appeal);

			const result = await controller.reviewAppeal('a1', dto, makeReq('admin-1'));

			expect(result).toBe(appeal);
			expect(service.reviewAppeal).toHaveBeenCalledWith('a1', 'admin-1', dto);
		});

		it('propagates ConflictException when appeal already resolved', async () => {
			service.reviewAppeal.mockRejectedValue(new ConflictException());

			await expect(controller.reviewAppeal('a1', {} as any, makeReq('admin-1'))).rejects.toThrow(
				ConflictException
			);
		});

		it('propagates ForbiddenException when not admin', async () => {
			service.reviewAppeal.mockRejectedValue(new ForbiddenException());

			await expect(controller.reviewAppeal('a1', {} as any, makeReq('user-1'))).rejects.toThrow(
				ForbiddenException
			);
		});
	});

	describe('searchAppeals', () => {
		it('calls service.findFiltered with adminId and query', async () => {
			const appeals = [{ id: 'a1' }] as Appeal[];
			service.findFiltered.mockResolvedValue(appeals);
			const query = { status: 'pending' } as any;

			const result = await controller.searchAppeals(query, makeReq('admin-1'));

			expect(result).toBe(appeals);
			expect(service.findFiltered).toHaveBeenCalledWith('admin-1', query);
		});
	});

	describe('getTimeline', () => {
		it('calls service.getTimeline with the appeal id', async () => {
			const timeline = { id: 'a1', sanction: { id: 's1' } } as any;
			service.getTimeline.mockResolvedValue(timeline);

			const result = await controller.getTimeline('a1');

			expect(result).toBe(timeline);
			expect(service.getTimeline).toHaveBeenCalledWith('a1');
		});
	});
});
