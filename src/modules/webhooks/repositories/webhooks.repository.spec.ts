import { WebhooksRepository } from './webhooks.repository';
import { Webhook } from '../entities/webhook.entity';

const mockQb = {
	where: jest.fn().mockReturnThis(),
	andWhere: jest.fn().mockReturnThis(),
	getMany: jest.fn(),
};

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	find: jest.fn(),
	findOne: jest.fn(),
	delete: jest.fn(),
	createQueryBuilder: jest.fn().mockReturnValue(mockQb),
};

describe('WebhooksRepository', () => {
	let repo: WebhooksRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		mockTypeormRepo.createQueryBuilder.mockReturnValue(mockQb);
		Object.values(mockQb).forEach((fn) => {
			if (typeof fn === 'function' && 'mockReturnThis' in fn) {
				(fn as jest.Mock).mockReturnThis();
			}
		});
		repo = new WebhooksRepository(mockTypeormRepo as any);
	});

	describe('create', () => {
		it('creates and saves a webhook', async () => {
			const data = { url: 'https://x.example', events: ['a'] } as Partial<Webhook>;
			const draft = { ...data } as Webhook;
			const saved = { id: 'w1', ...data } as Webhook;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.create(data);

			expect(mockTypeormRepo.create).toHaveBeenCalledWith(data);
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(result).toBe(saved);
		});
	});

	describe('findAll', () => {
		it('returns webhooks ordered by createdAt DESC', async () => {
			const hooks = [{ id: 'w1' }] as Webhook[];
			mockTypeormRepo.find.mockResolvedValue(hooks);

			const result = await repo.findAll();

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
			expect(result).toBe(hooks);
		});
	});

	describe('findById', () => {
		it('returns the webhook when found', async () => {
			const hook = { id: 'w1' } as Webhook;
			mockTypeormRepo.findOne.mockResolvedValue(hook);

			const result = await repo.findById('w1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { id: 'w1' } });
			expect(result).toBe(hook);
		});

		it('returns null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findById('missing');

			expect(result).toBeNull();
		});
	});

	describe('findActiveByEvent', () => {
		it('queries active webhooks subscribed to the event', async () => {
			const hooks = [{ id: 'w1' }] as Webhook[];
			mockQb.getMany.mockResolvedValue(hooks);

			const result = await repo.findActiveByEvent('sanction.created');

			expect(mockQb.where).toHaveBeenCalledWith('webhook.active = true');
			expect(mockQb.andWhere).toHaveBeenCalledWith('webhook.events @> :event', {
				event: JSON.stringify(['sanction.created']),
			});
			expect(result).toBe(hooks);
		});
	});

	describe('delete', () => {
		it('returns true when a row was removed', async () => {
			mockTypeormRepo.delete.mockResolvedValue({ affected: 1 });

			const result = await repo.delete('w1');

			expect(mockTypeormRepo.delete).toHaveBeenCalledWith('w1');
			expect(result).toBe(true);
		});

		it('returns false when nothing matched', async () => {
			mockTypeormRepo.delete.mockResolvedValue({ affected: 0 });

			const result = await repo.delete('missing');

			expect(result).toBe(false);
		});

		it('treats missing affected field as no-op', async () => {
			mockTypeormRepo.delete.mockResolvedValue({});

			const result = await repo.delete('missing');

			expect(result).toBe(false);
		});
	});
});
