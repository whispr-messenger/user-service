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
		it('should return a CSV string with header and rows', async () => {
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
			auditRepository.findAll.mockResolvedValue([log]);

			const result = await service.exportCsv('admin-1');

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(auditRepository.findAll).toHaveBeenCalledWith({ limit: 1000, offset: 0 });

			const lines = result.split('\n');
			expect(lines[0]).toBe('id,actor_id,action,target_type,target_id,metadata,created_at');
			expect(lines[1]).toContain('log-1');
			expect(lines[1]).toContain('admin-1');
			expect(lines[1]).toContain('sanction.create');
			expect(lines[1]).toContain('2026-01-15T10:00:00.000Z');
		});

		it('should return only the header when no logs exist', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			auditRepository.findAll.mockResolvedValue([]);

			const result = await service.exportCsv('admin-1');

			expect(result).toBe('id,actor_id,action,target_type,target_id,metadata,created_at');
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
			auditRepository.findAll.mockResolvedValue([log]);

			const result = await service.exportCsv('admin-1');
			const dataRow = result.split('\n')[1];

			// Double quotes inside the JSON should be escaped as ""
			expect(dataRow).toContain('""');
		});
	});
});
