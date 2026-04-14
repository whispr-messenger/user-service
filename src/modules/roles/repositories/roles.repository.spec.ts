import { RolesRepository } from './roles.repository';
import { UserRole } from '../entities/user-role.entity';

const mockTypeormRepo = {
	findOne: jest.fn(),
	create: jest.fn(),
	save: jest.fn(),
};

describe('RolesRepository', () => {
	let repo: RolesRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repo = new RolesRepository(mockTypeormRepo as any);
	});

	describe('findByUserId', () => {
		it('returns the role when found', async () => {
			const role = { id: 'r1', userId: 'u1', role: 'admin' } as UserRole;
			mockTypeormRepo.findOne.mockResolvedValue(role);

			const result = await repo.findByUserId('u1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { userId: 'u1' } });
			expect(result).toBe(role);
		});

		it('returns null when no role found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findByUserId('unknown');

			expect(result).toBeNull();
		});
	});

	describe('upsert', () => {
		it('updates existing role when one exists', async () => {
			const existing = { id: 'r1', userId: 'u1', role: 'user', grantedBy: 'old' } as UserRole;
			const saved = { ...existing, role: 'moderator', grantedBy: 'admin-1' } as UserRole;
			mockTypeormRepo.findOne.mockResolvedValue(existing);
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.upsert('u1', 'moderator', 'admin-1');

			expect(mockTypeormRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({ role: 'moderator', grantedBy: 'admin-1' })
			);
			expect(result).toBe(saved);
		});

		it('creates a new role when none exists', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);
			const draft = { userId: 'u1', role: 'admin', grantedBy: 'admin-1' } as UserRole;
			const saved = { id: 'r1', ...draft } as UserRole;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.upsert('u1', 'admin', 'admin-1');

			expect(mockTypeormRepo.create).toHaveBeenCalledWith({
				userId: 'u1',
				role: 'admin',
				grantedBy: 'admin-1',
			});
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(result).toBe(saved);
		});
	});
});
