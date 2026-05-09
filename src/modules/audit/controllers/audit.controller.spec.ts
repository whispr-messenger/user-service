import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Readable } from 'stream';
import type { Request as ExpressRequest, Response } from 'express';
import { AuditController } from './audit.controller';
import { AuditService } from '../services/audit.service';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { RolesGuard } from '../../roles/roles.guard';

const makeReq = (sub: string): ExpressRequest & { user: JwtPayload } =>
	({ user: { sub } as JwtPayload }) as ExpressRequest & { user: JwtPayload };

const makeRes = (): jest.Mocked<Response> => {
	const res = {
		setHeader: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
		// stream.pipe(res) appelle ces methodes implicitement
		on: jest.fn().mockReturnThis(),
		once: jest.fn().mockReturnThis(),
		emit: jest.fn().mockReturnThis(),
		write: jest.fn().mockReturnValue(true),
		end: jest.fn().mockReturnThis(),
		addTrailers: jest.fn().mockReturnThis(),
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
		})
			.overrideGuard(RolesGuard)
			.useValue({ canActivate: () => true })
			.compile();

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
				dateFrom: undefined,
				dateTo: undefined,
			});
		});

		it('passes parsed numeric values and string filters', async () => {
			service.list.mockResolvedValue({ data: [], total: 0 });

			await controller.list(
				'10',
				'5',
				'actor-1',
				'sanction',
				'create',
				'2026-01-01T00:00:00Z',
				'2026-02-01T00:00:00Z',
				makeReq('admin-1')
			);

			expect(service.list).toHaveBeenCalledWith('admin-1', {
				limit: 10,
				offset: 5,
				actorId: 'actor-1',
				targetType: 'sanction',
				action: 'create',
				dateFrom: new Date('2026-01-01T00:00:00Z'),
				dateTo: new Date('2026-02-01T00:00:00Z'),
			});
		});

		it('ignores invalid ISO dates and treats them as no filter', async () => {
			service.list.mockResolvedValue({ data: [], total: 0 });

			await controller.list(
				undefined as any,
				undefined as any,
				undefined as any,
				undefined as any,
				undefined as any,
				'not-a-date',
				'',
				makeReq('admin-1')
			);

			expect(service.list).toHaveBeenCalledWith('admin-1', {
				limit: 50,
				offset: 0,
				actorId: undefined,
				targetType: undefined,
				action: undefined,
				dateFrom: undefined,
				dateTo: undefined,
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
					undefined as any,
					undefined as any,
					makeReq('user-1')
				)
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe('exportCsv', () => {
		it('sets CSV content-type and pipes the stream', async () => {
			const stream = Readable.from(['id,action\n1,create']);
			const pipeSpy = jest.spyOn(stream, 'pipe').mockReturnValue({} as any);
			service.exportCsv.mockResolvedValue({ stream, totalRows: () => 1 });
			const res = makeRes();

			await controller.exportCsv(makeReq('admin-1'), res);

			expect(service.exportCsv).toHaveBeenCalledWith('admin-1');
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="audit-logs.csv"'
			);
			expect(pipeSpy).toHaveBeenCalledWith(res);
		});

		it('propagates ForbiddenException when not admin', async () => {
			service.exportCsv.mockRejectedValue(new ForbiddenException());

			await expect(controller.exportCsv(makeReq('user-1'), makeRes())).rejects.toThrow(
				ForbiddenException
			);
		});
	});
});
