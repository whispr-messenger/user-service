import { ReputationRepository } from './reputation.repository';
import { UserReputation } from '../entities/user-reputation.entity';

const mockTypeormRepo = {
	findOne: jest.fn(),
	create: jest.fn(),
	save: jest.fn(),
};

describe('ReputationRepository', () => {
	let repo: ReputationRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repo = new ReputationRepository(mockTypeormRepo as any);
	});

	describe('findByUserId', () => {
		it('returns the reputation row when found', async () => {
			const reputation = { userId: 'u1', score: 10 } as UserReputation;
			mockTypeormRepo.findOne.mockResolvedValue(reputation);

			const result = await repo.findByUserId('u1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { userId: 'u1' } });
			expect(result).toBe(reputation);
		});

		it('returns null when no row exists', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findByUserId('missing');

			expect(result).toBeNull();
		});
	});

	describe('create', () => {
		it('creates and saves a reputation entry', async () => {
			const data = { userId: 'u1', score: 0 } as Partial<UserReputation>;
			const draft = { ...data } as UserReputation;
			const saved = { ...draft, id: 'r1' } as UserReputation;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.create(data);

			expect(mockTypeormRepo.create).toHaveBeenCalledWith(data);
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(result).toBe(saved);
		});
	});

	describe('save', () => {
		it('persists an existing reputation instance', async () => {
			const reputation = { userId: 'u1', score: 3 } as UserReputation;
			mockTypeormRepo.save.mockResolvedValue(reputation);

			const result = await repo.save(reputation);

			expect(mockTypeormRepo.save).toHaveBeenCalledWith(reputation);
			expect(result).toBe(reputation);
		});
	});
});
