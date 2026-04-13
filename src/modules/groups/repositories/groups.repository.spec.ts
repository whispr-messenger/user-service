import { GroupsRepository } from './groups.repository';
import { Group } from '../entities/group.entity';

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	findOne: jest.fn(),
	find: jest.fn(),
	remove: jest.fn(),
};

describe('GroupsRepository', () => {
	let repo: GroupsRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repo = new GroupsRepository(mockTypeormRepo as any);
	});

	describe('findAllByOwner', () => {
		it('returns groups owned by the user', async () => {
			const groups = [{ id: 'g1' }] as Group[];
			mockTypeormRepo.find.mockResolvedValue(groups);

			const result = await repo.findAllByOwner('owner-1');

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({ where: { ownerId: 'owner-1' } });
			expect(result).toBe(groups);
		});
	});

	describe('findOneById', () => {
		it('returns a group by its id', async () => {
			const group = { id: 'g1' } as Group;
			mockTypeormRepo.findOne.mockResolvedValue(group);

			const result = await repo.findOneById('g1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { id: 'g1' } });
			expect(result).toBe(group);
		});

		it('returns null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findOneById('missing');

			expect(result).toBeNull();
		});
	});

	describe('findOneByOwnerAndId', () => {
		it('scopes the lookup to the owner and id', async () => {
			const group = { id: 'g1' } as Group;
			mockTypeormRepo.findOne.mockResolvedValue(group);

			const result = await repo.findOneByOwnerAndId('owner-1', 'g1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { ownerId: 'owner-1', id: 'g1' },
			});
			expect(result).toBe(group);
		});
	});

	describe('create', () => {
		it('creates and saves a group with a description', async () => {
			const draft = { ownerId: 'owner-1', name: 'Friends', description: 'IRL' } as Group;
			const saved = { id: 'g1', ...draft } as Group;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.create('owner-1', 'Friends', 'IRL');

			expect(mockTypeormRepo.create).toHaveBeenCalledWith({
				ownerId: 'owner-1',
				name: 'Friends',
				description: 'IRL',
			});
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(result).toBe(saved);
		});

		it('defaults description to null when not provided', async () => {
			const draft = { ownerId: 'owner-1', name: 'Friends', description: null } as Group;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(draft);

			await repo.create('owner-1', 'Friends');

			expect(mockTypeormRepo.create).toHaveBeenCalledWith({
				ownerId: 'owner-1',
				name: 'Friends',
				description: null,
			});
		});
	});

	describe('save', () => {
		it('delegates to the typeorm save', async () => {
			const group = { id: 'g1' } as Group;
			mockTypeormRepo.save.mockResolvedValue(group);

			const result = await repo.save(group);

			expect(mockTypeormRepo.save).toHaveBeenCalledWith(group);
			expect(result).toBe(group);
		});
	});

	describe('remove', () => {
		it('delegates to the typeorm remove', async () => {
			const group = { id: 'g1' } as Group;
			mockTypeormRepo.remove.mockResolvedValue(group);

			await repo.remove(group);

			expect(mockTypeormRepo.remove).toHaveBeenCalledWith(group);
		});
	});

	describe('findAllByOwnerPaginated', () => {
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
			const items = [{ id: 'g1' }, { id: 'g2' }] as any[];
			mockQb.getMany.mockResolvedValue(items);

			const result = await repo.findAllByOwnerPaginated('owner-1', 10);

			expect(result).toEqual({ data: items, nextCursor: null, hasMore: false });
			expect(mockQb.andWhere).not.toHaveBeenCalled();
		});

		it('returns hasMore=true and nextCursor when results exceed limit', async () => {
			const items = [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }] as any[];
			mockQb.getMany.mockResolvedValue(items);

			const result = await repo.findAllByOwnerPaginated('owner-1', 2, 'cursor-id');

			expect(result).toEqual({
				data: [{ id: 'g1' }, { id: 'g2' }],
				nextCursor: 'g2',
				hasMore: true,
			});
			expect(mockQb.andWhere).toHaveBeenCalledWith('group.id > :cursor', { cursor: 'cursor-id' });
		});
	});
});
