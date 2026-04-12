import { ContactRequestsRepository } from './contact-requests.repository';
import { ContactRequest, ContactRequestStatus } from '../entities/contact-request.entity';

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	findOne: jest.fn(),
	find: jest.fn(),
	remove: jest.fn(),
};

describe('ContactRequestsRepository', () => {
	let repo: ContactRequestsRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repo = new ContactRequestsRepository(mockTypeormRepo as any);
	});

	describe('findById', () => {
		it('returns the request when found', async () => {
			const request = { id: 'req-1' } as ContactRequest;
			mockTypeormRepo.findOne.mockResolvedValue(request);

			const result = await repo.findById('req-1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { id: 'req-1' } });
			expect(result).toBe(request);
		});

		it('returns null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findById('missing');

			expect(result).toBeNull();
		});
	});

	describe('findPendingBetween', () => {
		it('searches for a pending request in either direction', async () => {
			const request = { id: 'req-1' } as ContactRequest;
			mockTypeormRepo.findOne.mockResolvedValue(request);

			const result = await repo.findPendingBetween('user-a', 'user-b');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: [
					{ requesterId: 'user-a', recipientId: 'user-b', status: ContactRequestStatus.PENDING },
					{ requesterId: 'user-b', recipientId: 'user-a', status: ContactRequestStatus.PENDING },
				],
			});
			expect(result).toBe(request);
		});
	});

	describe('findAllForUser', () => {
		it('returns all requests involving the user with requester and recipient relations', async () => {
			const requests = [{ id: 'req-1' }] as ContactRequest[];
			mockTypeormRepo.find.mockResolvedValue(requests);

			const result = await repo.findAllForUser('user-a');

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({
				where: [{ requesterId: 'user-a' }, { recipientId: 'user-a' }],
				relations: ['requester', 'recipient'],
				order: { createdAt: 'DESC' },
			});
			expect(result).toBe(requests);
		});
	});

	describe('create', () => {
		it('creates a pending request and saves it', async () => {
			const draft = {
				requesterId: 'user-a',
				recipientId: 'user-b',
				status: ContactRequestStatus.PENDING,
			} as ContactRequest;
			const saved = { id: 'req-1', ...draft } as ContactRequest;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.create('user-a', 'user-b');

			expect(mockTypeormRepo.create).toHaveBeenCalledWith({
				requesterId: 'user-a',
				recipientId: 'user-b',
				status: ContactRequestStatus.PENDING,
			});
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(result).toBe(saved);
		});
	});

	describe('save', () => {
		it('delegates to the typeorm save', async () => {
			const request = { id: 'req-1' } as ContactRequest;
			mockTypeormRepo.save.mockResolvedValue(request);

			const result = await repo.save(request);

			expect(mockTypeormRepo.save).toHaveBeenCalledWith(request);
			expect(result).toBe(request);
		});
	});

	describe('remove', () => {
		it('delegates to the typeorm remove', async () => {
			const request = { id: 'req-1' } as ContactRequest;
			mockTypeormRepo.remove.mockResolvedValue(request);

			await repo.remove(request);

			expect(mockTypeormRepo.remove).toHaveBeenCalledWith(request);
		});
	});

	describe('findAllForUserPaginated', () => {
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
			const items = [{ id: 'r1' }, { id: 'r2' }] as any[];
			mockQb.getMany.mockResolvedValue(items);

			const result = await repo.findAllForUserPaginated('user-1', 10);

			expect(result).toEqual({ data: items, nextCursor: null, hasMore: false });
			expect(mockQb.andWhere).not.toHaveBeenCalled();
		});

		it('returns hasMore=true and nextCursor when results exceed limit', async () => {
			const items = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }] as any[];
			mockQb.getMany.mockResolvedValue(items);

			const result = await repo.findAllForUserPaginated('user-1', 2, 'cursor-id');

			expect(result).toEqual({
				data: [{ id: 'r1' }, { id: 'r2' }],
				nextCursor: 'r2',
				hasMore: true,
			});
			expect(mockQb.andWhere).toHaveBeenCalledWith('request.id < :cursor', { cursor: 'cursor-id' });
		});
	});

});
