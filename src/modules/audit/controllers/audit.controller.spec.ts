import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { AuditController } from './audit.controller';
import { AuditService } from '../services/audit.service';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

const makeReq = (sub: string): ExpressRequest & { user: JwtPayload } =>
	({ user: { sub } as JwtPayload }) as ExpressRequest & { user: JwtPayload };

const makeRes = (): jest.Mocked<Response> => {
	const res = {
		setHeader: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
	} as unknown as jest.Mocked<Response>;
	return res;
};

describe('AuditController', () => {
	let controller: AuditController;
	let service: jest.Mocked<AuditService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuditController],
			providers: [
				{
					provide: AuditService,
					useValue: {
						list: jest.fn(),
						exportCsv: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<AuditController>(AuditController);
		service = module.get(AuditService);
	});

	describe('list', () => {
		it('calls service.list with parsed query params and defaults', async () => {
			const data = { data: [], total: 0 };
			service.list.mockResolvedValue(data);

			const result = await controller.list(
				undefined as any,
				undefined as any,
				undefined as any,
				undefined as any,
				undefined as any,
				makeReq('admin-1')
			);

			expect(result).toEqual(data);
			expect(service.list).toHaveBeenCalledWith('admin-1', {
				limit: 50,
				offset: 0,
				actorId: undefined,
				targetType: undefined,
				action: undefined,
			});
		});

		it('passes parsed numeric values and string filters', async () => {
			service.list.mockResolvedValue({ data: [], total: 0 });

			await controller.list('10', '5', 'actor-1', 'sanction', 'create', makeReq('admin-1'));

			expect(service.list).toHaveBeenCalledWith('admin-1', {
				limit: 10,
				offset: 5,
				actorId: 'actor-1',
				targetType: 'sanction',
				action: 'create',
			});
		});

		it('propagates ForbiddenException when not admin', async () => {
			service.list.mockRejectedValue(new ForbiddenException());

			await expect(
				controller.list(
					undefined as any,
					undefined as any,
					undefined as any,
					undefined as any,
					undefined as any,
					makeReq('user-1')
				)
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe('exportCsv', () => {
		it('sets CSV content-type and sends the csv body', async () => {
			const csv = 'id,action\n1,create';
			service.exportCsv.mockResolvedValue(csv);
			const res = makeRes();

			await controller.exportCsv(makeReq('admin-1'), res);

			expect(service.exportCsv).toHaveBeenCalledWith('admin-1');
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="audit-logs.csv"'
			);
			expect(res.send).toHaveBeenCalledWith(csv);
		});

		it('propagates ForbiddenException when not admin', async () => {
			service.exportCsv.mockRejectedValue(new ForbiddenException());

			await expect(controller.exportCsv(makeReq('user-1'), makeRes())).rejects.toThrow(
				ForbiddenException
			);
		});
	});
});
