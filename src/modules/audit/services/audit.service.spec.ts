import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditRepository } from '../repositories/audit.repository';
import { RolesService } from '../../roles/services/roles.service';
import { AuditLog } from '../entities/audit-log.entity';

describe('AuditService', () => {
	let service: AuditService;
	let auditRepository: jest.Mocked<AuditRepository>;
	let rolesService: jest.Mocked<RolesService>;

	const mockAuditLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
		id: 'log-1',
		actorId: 'admin-1',
		action: 'sanction.create',
		targetType: 'user',
		targetId: 'user-1',
		metadata: { reason: 'spam' },
		createdAt: new Date('2026-01-15T10:00:00Z'),
		...overrides,
	});

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuditService,
				{
					provide: AuditRepository,
					useValue: {
						create: jest.fn(),
						findAll: jest.fn(),
						countAll: jest.fn(),
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

		service = module.get(AuditService);
		auditRepository = module.get(AuditRepository);
		rolesService = module.get(RolesService);
	});

	describe('log', () => {
		it('should create an audit log entry', async () => {
			const created = mockAuditLog();
			auditRepository.create.mockResolvedValue(created);

			const result = await service.log('admin-1', 'sanction.create', 'user', 'user-1', {
				reason: 'spam',
			});

			expect(auditRepository.create).toHaveBeenCalledWith({
				actorId: 'admin-1',
				action: 'sanction.create',
				targetType: 'user',
				targetId: 'user-1',
				metadata: { reason: 'spam' },
			});
			expect(result).toEqual(created);
		});

		it('should default metadata to empty object when not provided', async () => {
			auditRepository.create.mockResolvedValue(mockAuditLog({ metadata: {} }));

			await service.log('admin-1', 'role.set', 'user', 'user-2');

			expect(auditRepository.create).toHaveBeenCalledWith(expect.objectContaining({ metadata: {} }));
		});
	});

	describe('list', () => {
		it('should return paginated audit logs for admin/moderator', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const logs = [mockAuditLog()];
			auditRepository.findAll.mockResolvedValue(logs);
			auditRepository.countAll.mockResolvedValue(1);

			const result = await service.list('admin-1', { limit: 10, offset: 0 });

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(auditRepository.findAll).toHaveBeenCalledWith({ limit: 10, offset: 0 });
			expect(result).toEqual({ data: logs, total: 1 });
		});

		it('should pass filter options to repository', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			auditRepository.findAll.mockResolvedValue([]);
			auditRepository.countAll.mockResolvedValue(0);

			const query = { limit: 20, offset: 10, actorId: 'admin-1', action: 'sanction.create' };
			await service.list('admin-1', query);

			expect(auditRepository.findAll).toHaveBeenCalledWith(query);
			expect(auditRepository.countAll).toHaveBeenCalledWith({
				actorId: 'admin-1',
				action: 'sanction.create',
				targetType: undefined,
			});
		});

		it('should throw ForbiddenException for regular user', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(service.list('user-1', { limit: 10, offset: 0 })).rejects.toThrow(
				ForbiddenException
			);
		});
	});

	describe('exportCsv', () => {
		// helper : consomme le stream et retourne le CSV complet + le total final
		const drainStream = async (result: {
			stream: NodeJS.ReadableStream;
			totalRows: () => number;
		}): Promise<{ csv: string; totalRows: number }> => {
			const chunks: Buffer[] = [];
			for await (const chunk of result.stream) {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			}
			return {
				csv: Buffer.concat(chunks).toString('utf8'),
				totalRows: result.totalRows(),
			};
		};

		it('should stream a CSV with header and rows', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const log = mockAuditLog({
				id: 'log-1',
				actorId: 'admin-1',
				action: 'sanction.create',
				targetType: 'user',
				targetId: 'user-1',
				metadata: { reason: 'spam' },
				createdAt: new Date('2026-01-15T10:00:00.000Z'),
			});
			// premiere page avec une entree, puis page vide pour terminer la boucle
			auditRepository.findAll.mockResolvedValueOnce([log]).mockResolvedValueOnce([]);

			const result = await service.exportCsv('admin-1');
			const { csv, totalRows } = await drainStream(result);

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(auditRepository.findAll).toHaveBeenCalledWith({ limit: 1000, offset: 0 });

			const lines = csv.split('\n');
			expect(lines[0]).toBe('id,actor_id,action,target_type,target_id,metadata,created_at');
			expect(lines[1]).toContain('log-1');
			expect(lines[1]).toContain('admin-1');
			expect(lines[1]).toContain('sanction.create');
			expect(lines[1]).toContain('2026-01-15T10:00:00.000Z');
			expect(totalRows).toBe(1);
		});

		it('should iterate across pages until exhausted (no silent truncation)', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			// 1000 lignes premiere page, 5 lignes deuxieme page, terminate
			const firstPage = Array.from({ length: 1000 }, (_, i) =>
				mockAuditLog({ id: `log-${i}`, createdAt: new Date('2026-01-15T10:00:00.000Z') })
			);
			const secondPage = Array.from({ length: 5 }, (_, i) =>
				mockAuditLog({ id: `log-${1000 + i}`, createdAt: new Date('2026-01-15T10:00:00.000Z') })
			);
			auditRepository.findAll.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);

			const result = await service.exportCsv('admin-1');
			const { csv, totalRows } = await drainStream(result);

			expect(auditRepository.findAll).toHaveBeenNthCalledWith(1, { limit: 1000, offset: 0 });
			expect(auditRepository.findAll).toHaveBeenNthCalledWith(2, { limit: 1000, offset: 1000 });
			expect(totalRows).toBe(1005);
			expect(csv.split('\n')).toHaveLength(1006); // 1 header + 1005 rows
		});

		it('should return only the header when no logs exist', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			auditRepository.findAll.mockResolvedValue([]);

			const result = await service.exportCsv('admin-1');
			const { csv, totalRows } = await drainStream(result);

			expect(csv).toBe('id,actor_id,action,target_type,target_id,metadata,created_at');
			expect(totalRows).toBe(0);
		});

		it('should throw ForbiddenException for regular user', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(service.exportCsv('user-1')).rejects.toThrow(ForbiddenException);
		});

		it('should escape double quotes in metadata JSON', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const log = mockAuditLog({
				metadata: { note: 'said "hello"' },
				createdAt: new Date('2026-01-15T10:00:00.000Z'),
			});
			auditRepository.findAll.mockResolvedValueOnce([log]).mockResolvedValueOnce([]);

			const result = await service.exportCsv('admin-1');
			const { csv } = await drainStream(result);
			const dataRow = csv.split('\n')[1];

			// Double quotes inside the JSON should be escaped as ""
			expect(dataRow).toContain('""');
		});

		it('should neutralise formula injection vectors', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const log = mockAuditLog({
				action: '=cmd|calc!A1',
				targetType: '+SUM(A1)',
				targetId: '-1+1',
				metadata: { note: '@evil' },
				createdAt: new Date('2026-01-15T10:00:00.000Z'),
			});
			auditRepository.findAll.mockResolvedValueOnce([log]).mockResolvedValueOnce([]);

			const result = await service.exportCsv('admin-1');
			const { csv } = await drainStream(result);
			const dataRow = csv.split('\n')[1];

			// Each cell starting with =+-@ must be prefixed with a single quote.
			expect(dataRow).toContain(`"'=cmd|calc!A1"`);
			expect(dataRow).toContain(`"'+SUM(A1)"`);
			expect(dataRow).toContain(`"'-1+1"`);
		});
	});
});
