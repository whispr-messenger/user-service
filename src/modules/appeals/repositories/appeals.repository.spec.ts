import { AppealsRepository } from './appeals.repository';
import { Appeal } from '../entities/appeal.entity';

const mockQb = {
	orderBy: jest.fn().mockReturnThis(),
	andWhere: jest.fn().mockReturnThis(),
	take: jest.fn().mockReturnThis(),
	skip: jest.fn().mockReturnThis(),
	select: jest.fn().mockReturnThis(),
	addSelect: jest.fn().mockReturnThis(),
	groupBy: jest.fn().mockReturnThis(),
	delete: jest.fn().mockReturnThis(),
	from: jest.fn().mockReturnThis(),
	where: jest.fn().mockReturnThis(),
	execute: jest.fn(),
	getMany: jest.fn(),
	getRawMany: jest.fn(),
};

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	findOne: jest.fn(),
	find: jest.fn(),
	createQueryBuilder: jest.fn().mockReturnValue(mockQb),
};

describe('AppealsRepository', () => {
	let repo: AppealsRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		mockTypeormRepo.createQueryBuilder.mockReturnValue(mockQb);
		Object.values(mockQb).forEach((fn) => {
			if (typeof fn === 'function' && 'mockReturnThis' in fn) {
				(fn as jest.Mock).mockReturnThis();
			}
		});
		repo = new AppealsRepository(mockTypeormRepo as any);
	});

	describe('create', () => {
		it('creates and saves an appeal', async () => {
			const data = { userId: 'u1', sanctionId: 's1', reason: 'unfair' } as Partial<Appeal>;
			const draft = { ...data } as Appeal;
			const saved = { id: 'a1', ...data } as Appeal;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.create(data);

			expect(mockTypeormRepo.create).toHaveBeenCalledWith(data);
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(result).toBe(saved);
		});
	});

	describe('findById', () => {
		it('returns appeal when found', async () => {
			const appeal = { id: 'a1' } as Appeal;
			mockTypeormRepo.findOne.mockResolvedValue(appeal);

			const result = await repo.findById('a1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { id: 'a1' } });
			expect(result).toBe(appeal);
		});

		it('returns null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findById('missing');

			expect(result).toBeNull();
		});
	});

	describe('findByUserId', () => {
		it('returns appeals for user ordered by createdAt DESC', async () => {
			const appeals = [{ id: 'a1' }, { id: 'a2' }] as Appeal[];
			mockTypeormRepo.find.mockResolvedValue(appeals);

			const result = await repo.findByUserId('u1');

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({
				where: { userId: 'u1' },
				order: { createdAt: 'DESC' },
			});
			expect(result).toBe(appeals);
		});
	});

	describe('findPendingQueue', () => {
		it('returns pending appeals ordered oldest first with pagination', async () => {
			const appeals = [{ id: 'a1', status: 'pending' }] as Appeal[];
			mockTypeormRepo.find.mockResolvedValue(appeals);

			const result = await repo.findPendingQueue(10, 5);

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({
				where: { status: 'pending' },
				order: { createdAt: 'ASC' },
				take: 10,
				skip: 5,
			});
			expect(result).toBe(appeals);
		});

		it('uses default limit=50 and offset=0', async () => {
			mockTypeormRepo.find.mockResolvedValue([]);

			await repo.findPendingQueue();

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({
				where: { status: 'pending' },
				order: { createdAt: 'ASC' },
				take: 50,
				skip: 0,
			});
		});

		it('filters by type when provided', async () => {
			mockTypeormRepo.find.mockResolvedValue([]);

			await repo.findPendingQueue(10, 0, 'blocked_image');

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({
				where: { status: 'pending', type: 'blocked_image' },
				order: { createdAt: 'ASC' },
				take: 10,
				skip: 0,
			});
		});
	});

	describe('update', () => {
		it('saves and returns the updated appeal', async () => {
			const appeal = { id: 'a1', status: 'accepted' } as Appeal;
			mockTypeormRepo.save.mockResolvedValue(appeal);

			const result = await repo.update(appeal);

			expect(mockTypeormRepo.save).toHaveBeenCalledWith(appeal);
			expect(result).toBe(appeal);
		});
	});

	describe('getTimeline', () => {
		it('returns appeal with sanction relation loaded', async () => {
			const appeal = { id: 'a1', sanction: { id: 's1' } } as any;
			mockTypeormRepo.findOne.mockResolvedValue(appeal);

			const result = await repo.getTimeline('a1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { id: 'a1' },
				relations: ['sanction'],
			});
			expect(result).toBe(appeal);
		});
	});

	describe('findFiltered', () => {
		it('applies no filters when none are provided but still paginates and orders', async () => {
			const appeals = [{ id: 'a1' }] as Appeal[];
			mockQb.getMany.mockResolvedValue(appeals);

			const result = await repo.findFiltered({ limit: 25, offset: 10 });

			expect(mockQb.orderBy).toHaveBeenCalledWith('a.createdAt', 'DESC');
			expect(mockQb.andWhere).not.toHaveBeenCalled();
			expect(mockQb.take).toHaveBeenCalledWith(25);
			expect(mockQb.skip).toHaveBeenCalledWith(10);
			expect(result).toBe(appeals);
		});

		it('applies every filter when all are provided', async () => {
			mockQb.getMany.mockResolvedValue([]);
			const dateFrom = new Date('2026-01-01');
			const dateTo = new Date('2026-02-01');

			await repo.findFiltered({
				status: 'pending',
				userId: 'u1',
				sanctionId: 's1',
				type: 'sanction',
				dateFrom,
				dateTo,
				limit: 10,
				offset: 0,
			});

			expect(mockQb.andWhere).toHaveBeenCalledWith('a.status = :status', { status: 'pending' });
			expect(mockQb.andWhere).toHaveBeenCalledWith('a.userId = :userId', { userId: 'u1' });
			expect(mockQb.andWhere).toHaveBeenCalledWith('a.sanctionId = :sanctionId', { sanctionId: 's1' });
			expect(mockQb.andWhere).toHaveBeenCalledWith('a.type = :type', { type: 'sanction' });
			expect(mockQb.andWhere).toHaveBeenCalledWith('a.createdAt >= :dateFrom', { dateFrom });
			expect(mockQb.andWhere).toHaveBeenCalledWith('a.createdAt <= :dateTo', { dateTo });
		});
	});

	describe('getStatsByStatus', () => {
		it('groups by status and returns counts', async () => {
			const stats = [
				{ status: 'pending', count: 5 },
				{ status: 'accepted', count: 2 },
			];
			mockQb.getRawMany.mockResolvedValue(stats);

			const result = await repo.getStatsByStatus();

			expect(mockQb.select).toHaveBeenCalledWith('a.status', 'status');
			expect(mockQb.addSelect).toHaveBeenCalledWith('COUNT(*)::int', 'count');
			expect(mockQb.groupBy).toHaveBeenCalledWith('a.status');
			expect(result).toBe(stats);
		});
	});

	describe('deleteResolvedBefore', () => {
		it('removes resolved appeals older than cutoff and returns affected count', async () => {
			const cutoff = new Date('2025-01-01');
			mockQb.execute.mockResolvedValue({ affected: 3 });

			const result = await repo.deleteResolvedBefore(cutoff);

			expect(mockQb.delete).toHaveBeenCalled();
			expect(mockQb.from).toHaveBeenCalledWith(Appeal);
			expect(mockQb.where).toHaveBeenCalledWith('status IN (:...statuses)', {
				statuses: ['accepted', 'rejected'],
			});
			expect(mockQb.andWhere).toHaveBeenCalledWith('resolved_at < :cutoff', { cutoff });
			expect(result).toBe(3);
		});

		it('returns 0 when affected is undefined', async () => {
			mockQb.execute.mockResolvedValue({ affected: undefined });

			const result = await repo.deleteResolvedBefore(new Date());

			expect(result).toBe(0);
		});
	});
});
