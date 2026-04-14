import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SanctionsService } from './sanctions.service';
import { SanctionsRepository } from '../repositories/sanctions.repository';
import { UserRepository } from '../../common/repositories';
import { RolesService } from '../../roles/services/roles.service';
import { UserSanction } from '../entities/user-sanction.entity';

describe('SanctionsService — extended features', () => {
	let service: SanctionsService;
	let sanctionsRepository: jest.Mocked<SanctionsRepository>;
	let rolesService: jest.Mocked<RolesService>;

	const mockSanction = (overrides: Partial<UserSanction> = {}): UserSanction => ({
		id: 'sanction-1',
		userId: 'user-1',
		user: {} as any,
		type: 'warning',
		reason: 'Test reason',
		evidenceRef: {},
		issuedBy: 'admin-1',
		expiresAt: null,
		active: true,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		...overrides,
	});

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SanctionsService,
				{
					provide: SanctionsRepository,
					useValue: {
						create: jest.fn(),
						findById: jest.fn(),
						findActiveSanctionsForUser: jest.fn(),
						findAllActive: jest.fn(),
						lift: jest.fn(),
						expireOldSanctions: jest.fn(),
						findFiltered: jest.fn(),
						getStatsByType: jest.fn(),
					},
				},
				{
					provide: UserRepository,
					useValue: {
						findById: jest.fn(),
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

		service = module.get(SanctionsService);
		sanctionsRepository = module.get(SanctionsRepository);
		rolesService = module.get(RolesService);
	});

	describe('findFiltered', () => {
		it('should pass parsed filters to repository', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const sanctions = [mockSanction()];
			sanctionsRepository.findFiltered.mockResolvedValue(sanctions);

			const result = await service.findFiltered('admin-1', {
				type: 'warning',
				userId: 'user-1',
				active: 'true',
				dateFrom: '2026-01-01',
				dateTo: '2026-12-31',
				limit: '10',
				offset: '5',
			});

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(sanctionsRepository.findFiltered).toHaveBeenCalledWith({
				type: 'warning',
				userId: 'user-1',
				active: true,
				dateFrom: new Date('2026-01-01'),
				dateTo: new Date('2026-12-31'),
				limit: 10,
				offset: 5,
			});
			expect(result).toEqual(sanctions);
		});

		it('should use default limit and offset when not provided', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			sanctionsRepository.findFiltered.mockResolvedValue([]);

			await service.findFiltered('admin-1', {});

			expect(sanctionsRepository.findFiltered).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 50, offset: 0 })
			);
		});

		it('should throw ForbiddenException for non-admin', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(service.findFiltered('user-1', {})).rejects.toThrow(ForbiddenException);
		});

		it('should parse active=false correctly', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			sanctionsRepository.findFiltered.mockResolvedValue([]);

			await service.findFiltered('admin-1', { active: 'false' });

			expect(sanctionsRepository.findFiltered).toHaveBeenCalledWith(
				expect.objectContaining({ active: false })
			);
		});
	});

	describe('getStats', () => {
		it('should return sanction stats by type', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const stats = [
				{ type: 'warning', count: 10 },
				{ type: 'temp_ban', count: 5 },
				{ type: 'perm_ban', count: 1 },
			];
			sanctionsRepository.getStatsByType.mockResolvedValue(stats);

			const result = await service.getStats('admin-1');

			expect(result).toEqual(stats);
		});

		it('should throw ForbiddenException for non-admin', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(service.getStats('user-1')).rejects.toThrow(ForbiddenException);
		});
	});
});
