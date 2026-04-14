import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesRepository } from '../repositories/roles.repository';
import { UserRepository } from '../../common/repositories';
import { UserRole } from '../entities/user-role.entity';
import { UserRoleEnum } from '../dto/set-role.dto';

describe('RolesService', () => {
	let service: RolesService;
	let rolesRepository: jest.Mocked<RolesRepository>;
	let userRepository: jest.Mocked<UserRepository>;

	const mockUserRole = (overrides: Partial<UserRole> = {}): UserRole => ({
		id: 'role-1',
		userId: 'user-1',
		user: {} as any,
		role: 'admin',
		grantedBy: 'admin-1',
		createdAt: new Date('2026-01-01'),
		...overrides,
	});

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RolesService,
				{
					provide: RolesRepository,
					useValue: {
						findByUserId: jest.fn(),
						upsert: jest.fn(),
					},
				},
				{
					provide: UserRepository,
					useValue: {
						findById: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get(RolesService);
		rolesRepository = module.get(RolesRepository);
		userRepository = module.get(UserRepository);
	});

	describe('getMyRole', () => {
		it('should return the user role when one exists', async () => {
			rolesRepository.findByUserId.mockResolvedValue(mockUserRole({ role: 'moderator' }));

			const result = await service.getMyRole('user-1');

			expect(result).toEqual({ role: 'moderator' });
			expect(rolesRepository.findByUserId).toHaveBeenCalledWith('user-1');
		});

		it('should return "user" when no role record exists', async () => {
			rolesRepository.findByUserId.mockResolvedValue(null);

			const result = await service.getMyRole('user-1');

			expect(result).toEqual({ role: 'user' });
		});
	});

	describe('setRole', () => {
		it('should set a role when caller is admin and target exists', async () => {
			const adminRole = mockUserRole({ userId: 'admin-1', role: 'admin' });
			const created = mockUserRole({ userId: 'target-1', role: 'moderator' });

			rolesRepository.findByUserId.mockResolvedValue(adminRole);
			userRepository.findById.mockResolvedValue({ id: 'target-1' } as any);
			rolesRepository.upsert.mockResolvedValue(created);

			const result = await service.setRole('target-1', { role: UserRoleEnum.MODERATOR }, 'admin-1');

			expect(result).toEqual(created);
			expect(rolesRepository.upsert).toHaveBeenCalledWith(
				'target-1',
				UserRoleEnum.MODERATOR,
				'admin-1'
			);
		});

		it('should throw ForbiddenException when caller is not admin', async () => {
			rolesRepository.findByUserId.mockResolvedValue(mockUserRole({ role: 'moderator' }));

			await expect(
				service.setRole('target-1', { role: UserRoleEnum.MODERATOR }, 'mod-1')
			).rejects.toThrow(ForbiddenException);
		});

		it('should throw NotFoundException when target user does not exist', async () => {
			rolesRepository.findByUserId.mockResolvedValue(mockUserRole({ role: 'admin' }));
			userRepository.findById.mockResolvedValue(null);

			await expect(
				service.setRole('unknown-user', { role: UserRoleEnum.MODERATOR }, 'admin-1')
			).rejects.toThrow(NotFoundException);
		});
	});

	describe('isAdminOrModerator', () => {
		it('should return true for admin', async () => {
			rolesRepository.findByUserId.mockResolvedValue(mockUserRole({ role: 'admin' }));
			expect(await service.isAdminOrModerator('user-1')).toBe(true);
		});

		it('should return true for moderator', async () => {
			rolesRepository.findByUserId.mockResolvedValue(mockUserRole({ role: 'moderator' }));
			expect(await service.isAdminOrModerator('user-1')).toBe(true);
		});

		it('should return false for regular user', async () => {
			rolesRepository.findByUserId.mockResolvedValue(mockUserRole({ role: 'user' }));
			expect(await service.isAdminOrModerator('user-1')).toBe(false);
		});

		it('should return false when no role exists', async () => {
			rolesRepository.findByUserId.mockResolvedValue(null);
			expect(await service.isAdminOrModerator('user-1')).toBe(false);
		});
	});

	describe('ensureAdmin', () => {
		it('should pass for admin role', async () => {
			rolesRepository.findByUserId.mockResolvedValue(mockUserRole({ role: 'admin' }));
			await expect(service.ensureAdmin('admin-1')).resolves.toBeUndefined();
		});

		it('should throw ForbiddenException for moderator', async () => {
			rolesRepository.findByUserId.mockResolvedValue(mockUserRole({ role: 'moderator' }));
			await expect(service.ensureAdmin('mod-1')).rejects.toThrow(ForbiddenException);
		});

		it('should throw ForbiddenException for regular user', async () => {
			rolesRepository.findByUserId.mockResolvedValue(mockUserRole({ role: 'user' }));
			await expect(service.ensureAdmin('user-1')).rejects.toThrow(ForbiddenException);
		});

		it('should throw ForbiddenException when no role exists', async () => {
			rolesRepository.findByUserId.mockResolvedValue(null);
			await expect(service.ensureAdmin('user-1')).rejects.toThrow(ForbiddenException);
		});
	});

	describe('ensureAdminOrModerator', () => {
		it('should pass for admin', async () => {
			rolesRepository.findByUserId.mockResolvedValue(mockUserRole({ role: 'admin' }));
			await expect(service.ensureAdminOrModerator('admin-1')).resolves.toBeUndefined();
		});

		it('should pass for moderator', async () => {
			rolesRepository.findByUserId.mockResolvedValue(mockUserRole({ role: 'moderator' }));
			await expect(service.ensureAdminOrModerator('mod-1')).resolves.toBeUndefined();
		});

		it('should throw ForbiddenException for regular user', async () => {
			rolesRepository.findByUserId.mockResolvedValue(mockUserRole({ role: 'user' }));
			await expect(service.ensureAdminOrModerator('user-1')).rejects.toThrow(ForbiddenException);
		});

		it('should throw ForbiddenException when no role exists', async () => {
			rolesRepository.findByUserId.mockResolvedValue(null);
			await expect(service.ensureAdminOrModerator('user-1')).rejects.toThrow(ForbiddenException);
		});
	});
});
