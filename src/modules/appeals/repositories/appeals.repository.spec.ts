import { AppealsRepository } from './appeals.repository';
import { Appeal } from '../entities/appeal.entity';

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	findOne: jest.fn(),
	find: jest.fn(),
};

describe('AppealsRepository', () => {
	let repo: AppealsRepository;

	beforeEach(() => {
		jest.clearAllMocks();
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
});
