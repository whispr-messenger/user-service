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
});
