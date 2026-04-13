import { BlockedUsersRepository } from './blocked-users.repository';
import { BlockedUser } from '../entities/blocked-user.entity';

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	findOne: jest.fn(),
	find: jest.fn(),
	remove: jest.fn(),
};

describe('BlockedUsersRepository', () => {
	let repo: BlockedUsersRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repo = new BlockedUsersRepository(mockTypeormRepo as any);
	});

	describe('findAllByBlocker', () => {
		it('returns the blocked users for the blocker', async () => {
			const rows = [{ id: 'b1' }] as BlockedUser[];
			mockTypeormRepo.find.mockResolvedValue(rows);

			const result = await repo.findAllByBlocker('blocker-1');

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({ where: { blockerId: 'blocker-1' } });
			expect(result).toBe(rows);
		});
	});

	describe('findOne', () => {
		it('returns the blocked-user entry when found', async () => {
			const row = { id: 'b1' } as BlockedUser;
			mockTypeormRepo.findOne.mockResolvedValue(row);

			const result = await repo.findOne('blocker-1', 'blocked-1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { blockerId: 'blocker-1', blockedId: 'blocked-1' },
			});
			expect(result).toBe(row);
		});

		it('returns null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findOne('blocker-1', 'missing');

			expect(result).toBeNull();
		});
	});

	describe('create', () => {
		it('creates and saves a blocked-user entry', async () => {
			const draft = { blockerId: 'blocker-1', blockedId: 'blocked-1' } as BlockedUser;
			const saved = { id: 'b1', ...draft } as BlockedUser;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.create('blocker-1', 'blocked-1');

			expect(mockTypeormRepo.create).toHaveBeenCalledWith({
				blockerId: 'blocker-1',
				blockedId: 'blocked-1',
			});
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(result).toBe(saved);
		});
	});

	describe('remove', () => {
		it('delegates to the typeorm remove', async () => {
			const row = { id: 'b1' } as BlockedUser;
			mockTypeormRepo.remove.mockResolvedValue(row);

			await repo.remove(row);

			expect(mockTypeormRepo.remove).toHaveBeenCalledWith(row);
		});
	});

	describe('findAllByBlockerPaginated', () => {
		const mockQb = {
			leftJoinAndSelect: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			andWhere: jest.fn().mockReturnThis(),
			orderBy: jest.fn().mockReturnThis(),
			addOrderBy: jest.fn().mockReturnThis(),
			take: jest.fn().mockReturnThis(),
			getMany: jest.fn(),
		};

		beforeEach(() => {
			(mockTypeormRepo as any).createQueryBuilder = jest.fn().mockReturnValue(mockQb);
			Object.values(mockQb).forEach((fn) => {
				if (typeof fn === 'function' && 'mockClear' in fn) (fn as jest.Mock).mockClear();
			});
			mockQb.leftJoinAndSelect.mockReturnValue(mockQb);
			mockQb.where.mockReturnValue(mockQb);
			mockQb.andWhere.mockReturnValue(mockQb);
			mockQb.orderBy.mockReturnValue(mockQb);
			mockQb.addOrderBy.mockReturnValue(mockQb);
			mockQb.take.mockReturnValue(mockQb);
		});

		it('returns data with hasMore=false when results fit within limit', async () => {
			const items = [{ id: 'b1' }, { id: 'b2' }] as any[];
			mockQb.getMany.mockResolvedValue(items);

			const result = await repo.findAllByBlockerPaginated('blocker-1', 10);

			expect(result).toEqual({ data: items, nextCursor: null, hasMore: false });
			expect(mockQb.andWhere).not.toHaveBeenCalled();
		});

		it('returns hasMore=true and nextCursor when results exceed limit', async () => {
			const items = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }] as any[];
			mockQb.getMany.mockResolvedValue(items);

			const result = await repo.findAllByBlockerPaginated('blocker-1', 2, 'cursor-id');

			expect(result).toEqual({
				data: [{ id: 'b1' }, { id: 'b2' }],
				nextCursor: 'b2',
				hasMore: true,
			});
			expect(mockQb.andWhere).toHaveBeenCalledWith('blocked.id > :cursor', { cursor: 'cursor-id' });
		});
	});
});
