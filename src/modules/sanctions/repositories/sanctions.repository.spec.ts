import { SanctionsRepository } from './sanctions.repository';
import { UserSanction } from '../entities/user-sanction.entity';

const mockQb = {
	update: jest.fn().mockReturnThis(),
	set: jest.fn().mockReturnThis(),
	where: jest.fn().mockReturnThis(),
	andWhere: jest.fn().mockReturnThis(),
	orderBy: jest.fn().mockReturnThis(),
	take: jest.fn().mockReturnThis(),
	skip: jest.fn().mockReturnThis(),
	execute: jest.fn(),
	getMany: jest.fn(),
	select: jest.fn().mockReturnThis(),
	addSelect: jest.fn().mockReturnThis(),
	groupBy: jest.fn().mockReturnThis(),
	getRawMany: jest.fn(),
};

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	findOne: jest.fn(),
	find: jest.fn(),
	createQueryBuilder: jest.fn().mockReturnValue(mockQb),
};

describe('SanctionsRepository', () => {
	let repo: SanctionsRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		mockTypeormRepo.createQueryBuilder.mockReturnValue(mockQb);
		// Reset chainable mocks
		Object.values(mockQb).forEach((fn) => {
			if (typeof fn === 'function' && 'mockReturnThis' in fn) {
				(fn as jest.Mock).mockReturnThis();
			}
		});
		repo = new SanctionsRepository(mockTypeormRepo as any);
	});

	describe('create', () => {
		it('creates and saves a sanction', async () => {
			const data = { userId: 'u1', type: 'warning', reason: 'spam' } as Partial<UserSanction>;
			const draft = { ...data } as UserSanction;
			const saved = { id: 's1', ...data } as UserSanction;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.create(data);

			expect(mockTypeormRepo.create).toHaveBeenCalledWith(data);
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(result).toBe(saved);
		});
	});

	describe('findById', () => {
		it('returns sanction when found', async () => {
			const sanction = { id: 's1' } as UserSanction;
			mockTypeormRepo.findOne.mockResolvedValue(sanction);

			const result = await repo.findById('s1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { id: 's1' } });
			expect(result).toBe(sanction);
		});

		it('returns null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findById('missing');

			expect(result).toBeNull();
		});
	});

	describe('findActiveSanctionsForUser', () => {
		it('finds active sanctions for user ordered by createdAt DESC', async () => {
			const sanctions = [{ id: 's1', active: true }] as UserSanction[];
			mockTypeormRepo.find.mockResolvedValue(sanctions);

			const result = await repo.findActiveSanctionsForUser('u1');

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({
				where: { userId: 'u1', active: true },
				order: { createdAt: 'DESC' },
			});
			expect(result).toBe(sanctions);
		});
	});

	describe('lift', () => {
		it('sets active to false and saves', async () => {
			const sanction = { id: 's1', active: true } as UserSanction;
			const saved = { ...sanction, active: false } as UserSanction;
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.lift(sanction);

			expect(sanction.active).toBe(false);
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(sanction);
			expect(result).toBe(saved);
		});
	});

	describe('expireOldSanctions', () => {
		it('executes update query and returns affected count', async () => {
			mockQb.execute.mockResolvedValue({ affected: 3 });

			const result = await repo.expireOldSanctions();

			expect(mockTypeormRepo.createQueryBuilder).toHaveBeenCalled();
			expect(mockQb.update).toHaveBeenCalledWith(UserSanction);
			expect(mockQb.set).toHaveBeenCalledWith({ active: false });
			expect(mockQb.where).toHaveBeenCalledWith('active = true');
			expect(result).toBe(3);
		});

		it('returns 0 when no sanctions expired', async () => {
			mockQb.execute.mockResolvedValue({ affected: 0 });

			const result = await repo.expireOldSanctions();

			expect(result).toBe(0);
		});
	});
});
