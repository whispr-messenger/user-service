import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { SanctionsService } from './sanctions.service';
import { SanctionsRepository } from '../repositories/sanctions.repository';
import { UserRepository } from '../../common/repositories';
import { RolesService } from '../../roles/services/roles.service';
import { UserSanction } from '../entities/user-sanction.entity';
import { SanctionType } from '../dto/create-sanction.dto';

describe('SanctionsService', () => {
	let service: SanctionsService;
	let sanctionsRepository: jest.Mocked<SanctionsRepository>;
	let userRepository: jest.Mocked<UserRepository>;
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
		userRepository = module.get(UserRepository);
		rolesService = module.get(RolesService);
	});

	describe('createSanction', () => {
		const dto = {
			userId: 'user-1',
			type: SanctionType.WARNING,
			reason: 'Spam',
		};

		it('should create a sanction when caller is admin/moderator and user exists', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			userRepository.findById.mockResolvedValue({ id: 'user-1' } as any);
			const created = mockSanction();
			sanctionsRepository.create.mockResolvedValue(created);

			const result = await service.createSanction(dto, 'admin-1');

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(userRepository.findById).toHaveBeenCalledWith('user-1');
			expect(sanctionsRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-1',
					type: SanctionType.WARNING,
					reason: 'Spam',
					issuedBy: 'admin-1',
					active: true,
				})
			);
			expect(result).toEqual(created);
		});

		it('should throw ForbiddenException when caller lacks role', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(service.createSanction(dto, 'user-2')).rejects.toThrow(ForbiddenException);
			expect(sanctionsRepository.create).not.toHaveBeenCalled();
		});

		it('should throw NotFoundException when target user does not exist', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			userRepository.findById.mockResolvedValue(null);

			await expect(service.createSanction(dto, 'admin-1')).rejects.toThrow(NotFoundException);
		});

		it('should handle expiresAt when provided', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			userRepository.findById.mockResolvedValue({ id: 'user-1' } as any);
			sanctionsRepository.create.mockResolvedValue(mockSanction());

			await service.createSanction({ ...dto, expiresAt: '2026-12-31T00:00:00Z' }, 'admin-1');

			expect(sanctionsRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					expiresAt: new Date('2026-12-31T00:00:00Z'),
				})
			);
		});
	});

	describe('createAutoSanction', () => {
		it('should create a sanction without role check', async () => {
			const created = mockSanction({ issuedBy: 'system', evidenceRef: { auto: true } });
			sanctionsRepository.create.mockResolvedValue(created);

			const result = await service.createAutoSanction('user-1', 'warning', 'Auto-detected spam');

			expect(rolesService.ensureAdminOrModerator).not.toHaveBeenCalled();
			expect(sanctionsRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-1',
					type: 'warning',
					reason: 'Auto-detected spam',
					issuedBy: 'system',
					evidenceRef: { auto: true },
					active: true,
				})
			);
			expect(result).toEqual(created);
		});

		it('should pass expiresAt when provided', async () => {
			const expires = new Date('2026-06-01');
			sanctionsRepository.create.mockResolvedValue(mockSanction());

			await service.createAutoSanction('user-1', 'temp_ban', 'Auto ban', expires);

			expect(sanctionsRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({ expiresAt: expires })
			);
		});
	});

	describe('getMySanctions', () => {
		it('should return active sanctions for the user', async () => {
			const sanctions = [mockSanction(), mockSanction({ id: 'sanction-2' })];
			sanctionsRepository.findActiveSanctionsForUser.mockResolvedValue(sanctions);

			const result = await service.getMySanctions('user-1');

			expect(result).toEqual(sanctions);
			expect(sanctionsRepository.findActiveSanctionsForUser).toHaveBeenCalledWith('user-1');
		});

		it('should return empty array when no active sanctions', async () => {
			sanctionsRepository.findActiveSanctionsForUser.mockResolvedValue([]);

			const result = await service.getMySanctions('user-1');

			expect(result).toEqual([]);
		});
	});

	describe('listAllActive', () => {
		it('should return all active sanctions for admin/moderator', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const sanctions = [mockSanction()];
			sanctionsRepository.findAllActive.mockResolvedValue(sanctions);

			const result = await service.listAllActive('admin-1', 10, 0);

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(sanctionsRepository.findAllActive).toHaveBeenCalledWith(10, 0);
			expect(result).toEqual(sanctions);
		});

		it('should throw ForbiddenException for regular user', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(service.listAllActive('user-1')).rejects.toThrow(ForbiddenException);
		});
	});

	describe('getSanction', () => {
		it('should return the sanction when found', async () => {
			const sanction = mockSanction();
			sanctionsRepository.findById.mockResolvedValue(sanction);

			const result = await service.getSanction('sanction-1');

			expect(result).toEqual(sanction);
		});

		it('should throw NotFoundException when sanction does not exist', async () => {
			sanctionsRepository.findById.mockResolvedValue(null);

			await expect(service.getSanction('unknown')).rejects.toThrow(NotFoundException);
		});
	});

	describe('liftSanction', () => {
		it('should lift an active sanction', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const sanction = mockSanction({ active: true });
			sanctionsRepository.findById.mockResolvedValue(sanction);
			const lifted = mockSanction({ active: false });
			sanctionsRepository.lift.mockResolvedValue(lifted);

			const result = await service.liftSanction('sanction-1', 'admin-1');

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(sanctionsRepository.lift).toHaveBeenCalledWith(sanction);
			expect(result).toEqual(lifted);
		});

		it('should throw ForbiddenException when caller lacks role', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(service.liftSanction('sanction-1', 'user-1')).rejects.toThrow(ForbiddenException);
		});

		it('should throw NotFoundException when sanction does not exist', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			sanctionsRepository.findById.mockResolvedValue(null);

			await expect(service.liftSanction('unknown', 'admin-1')).rejects.toThrow(NotFoundException);
		});

		it('should throw ConflictException when sanction is already lifted', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			sanctionsRepository.findById.mockResolvedValue(mockSanction({ active: false }));

			await expect(service.liftSanction('sanction-1', 'admin-1')).rejects.toThrow(ConflictException);
		});
	});

	describe('hasActiveBan', () => {
		it('should return true when user has an active temp_ban', async () => {
			sanctionsRepository.findActiveSanctionsForUser.mockResolvedValue([
				mockSanction({ type: 'temp_ban' }),
			]);

			expect(await service.hasActiveBan('user-1')).toBe(true);
		});

		it('should return true when user has an active perm_ban', async () => {
			sanctionsRepository.findActiveSanctionsForUser.mockResolvedValue([
				mockSanction({ type: 'perm_ban' }),
			]);

			expect(await service.hasActiveBan('user-1')).toBe(true);
		});

		it('should return false when user only has warnings', async () => {
			sanctionsRepository.findActiveSanctionsForUser.mockResolvedValue([
				mockSanction({ type: 'warning' }),
			]);

			expect(await service.hasActiveBan('user-1')).toBe(false);
		});

		it('should return false when user has no active sanctions', async () => {
			sanctionsRepository.findActiveSanctionsForUser.mockResolvedValue([]);

			expect(await service.hasActiveBan('user-1')).toBe(false);
		});
	});

	describe('expireSanctions', () => {
		it('should return count of expired sanctions', async () => {
			sanctionsRepository.expireOldSanctions.mockResolvedValue(5);

			const result = await service.expireSanctions();

			expect(result).toBe(5);
			expect(sanctionsRepository.expireOldSanctions).toHaveBeenCalled();
		});
	});

	// WHISPR-1063
	describe('bulkLiftSanctions', () => {
		it('processes every id and groups successes vs failures', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			sanctionsRepository.findById.mockImplementation(async (id: string) => {
				if (id === 's-lifted') return mockSanction({ id: 's-lifted', active: false });
				if (id === 's-missing') return null;
				return mockSanction({ id, active: true });
			});
			sanctionsRepository.lift.mockImplementation(async (s: UserSanction) => ({
				...s,
				active: false,
			}));

			const result = await service.bulkLiftSanctions('admin-1', [
				's-1',
				's-lifted',
				's-missing',
				's-2',
			]);

			expect(result.succeeded).toEqual(['s-1', 's-2']);
			expect(result.failed.map((f) => f.sanctionId)).toEqual(['s-lifted', 's-missing']);
			expect(result.failed[0].error).toMatch(/already lifted/i);
			expect(result.failed[1].error).toMatch(/not found/i);
		});

		it('checks the caller role up-front before touching any sanction', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const order: string[] = [];
			rolesService.ensureAdminOrModerator.mockImplementation(async () => {
				order.push('role');
			});
			sanctionsRepository.findById.mockImplementation(async () => {
				order.push('find');
				return mockSanction({ active: true });
			});
			sanctionsRepository.lift.mockImplementation(async (s: UserSanction) => ({
				...s,
				active: false,
			}));

			await service.bulkLiftSanctions('admin-1', ['a', 'b', 'c']);

			expect(order[0]).toBe('role');
		});

		it('throws ForbiddenException before touching any sanction when caller lacks role', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(service.bulkLiftSanctions('user-1', ['a'])).rejects.toThrow(ForbiddenException);

			expect(sanctionsRepository.findById).not.toHaveBeenCalled();
		});

		it('returns empty buckets for an empty id list (defensive)', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);

			const result = await service.bulkLiftSanctions('admin-1', []);

			expect(result).toEqual({ succeeded: [], failed: [] });
			expect(sanctionsRepository.findById).not.toHaveBeenCalled();
		});
	});
});
