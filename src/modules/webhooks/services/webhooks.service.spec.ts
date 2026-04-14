import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WebhooksService, WebhookEvent } from './webhooks.service';
import { WebhooksRepository } from '../repositories/webhooks.repository';
import { Webhook } from '../entities/webhook.entity';

describe('WebhooksService', () => {
	let service: WebhooksService;
	let repo: jest.Mocked<WebhooksRepository>;

	const mockWebhook = (overrides: Partial<Webhook> = {}): Webhook => ({
		id: 'wh-1',
		url: 'https://example.com/hook',
		events: ['sanction.created'],
		secret: 'test-secret',
		active: true,
		createdBy: 'admin-1',
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		...overrides,
	});

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				WebhooksService,
				{
					provide: WebhooksRepository,
					useValue: {
						create: jest.fn(),
						findAll: jest.fn(),
						findById: jest.fn(),
						findActiveByEvent: jest.fn(),
						delete: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get(WebhooksService);
		repo = module.get(WebhooksRepository);
	});

	describe('register', () => {
		it('should create a webhook with the given data', async () => {
			const dto = {
				url: 'https://example.com/hook',
				events: ['sanction.created', 'appeal.resolved'],
				secret: 'my-secret',
			};
			const created = mockWebhook({ events: dto.events, secret: dto.secret });
			repo.create.mockResolvedValue(created);

			const result = await service.register(dto, 'admin-1');

			expect(repo.create).toHaveBeenCalledWith({
				url: dto.url,
				events: dto.events,
				secret: dto.secret,
				active: true,
				createdBy: 'admin-1',
			});
			expect(result).toEqual(created);
		});

		it('should set secret to null when not provided', async () => {
			const dto = {
				url: 'https://example.com/hook',
				events: ['sanction.created'],
			};
			repo.create.mockResolvedValue(mockWebhook({ secret: null }));

			await service.register(dto, 'admin-1');

			expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ secret: null }));
		});
	});

	describe('list', () => {
		it('should return all webhooks', async () => {
			const webhooks = [mockWebhook(), mockWebhook({ id: 'wh-2' })];
			repo.findAll.mockResolvedValue(webhooks);

			const result = await service.list();

			expect(result).toEqual(webhooks);
		});

		it('should return empty array when none exist', async () => {
			repo.findAll.mockResolvedValue([]);

			const result = await service.list();

			expect(result).toEqual([]);
		});
	});

	describe('remove', () => {
		it('should delete the webhook when it exists', async () => {
			repo.delete.mockResolvedValue(true);

			await expect(service.remove('wh-1')).resolves.toBeUndefined();
			expect(repo.delete).toHaveBeenCalledWith('wh-1');
		});

		it('should throw NotFoundException when webhook does not exist', async () => {
			repo.delete.mockResolvedValue(false);

			await expect(service.remove('unknown')).rejects.toThrow(NotFoundException);
		});
	});

	describe('dispatch', () => {
		let fetchSpy: jest.SpyInstance;

		beforeEach(() => {
			fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
				ok: true,
				status: 200,
			} as Response);
		});

		afterEach(() => {
			fetchSpy.mockRestore();
		});

		it('should send POST to matching webhooks with HMAC signature', async () => {
			const webhook = mockWebhook({ secret: 'my-secret' });
			repo.findActiveByEvent.mockResolvedValue([webhook]);

			const event: WebhookEvent = {
				type: 'sanction.created',
				timestamp: '2026-01-01T00:00:00Z',
				data: { sanctionId: 'sanc-1' },
			};

			await service.dispatch(event);

			expect(repo.findActiveByEvent).toHaveBeenCalledWith('sanction.created');
			expect(fetchSpy).toHaveBeenCalledWith(
				webhook.url,
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						'X-Webhook-Event': 'sanction.created',
						'X-Webhook-Signature': expect.stringMatching(/^sha256=.+$/),
					}),
				})
			);
		});

		it('should not include signature when webhook has no secret', async () => {
			const webhook = mockWebhook({ secret: null });
			repo.findActiveByEvent.mockResolvedValue([webhook]);

			const event: WebhookEvent = {
				type: 'sanction.created',
				timestamp: '2026-01-01T00:00:00Z',
				data: {},
			};

			await service.dispatch(event);

			const callArgs = fetchSpy.mock.calls[0][1];
			expect(callArgs.headers['X-Webhook-Signature']).toBeUndefined();
		});

		it('should not throw when fetch fails', async () => {
			fetchSpy.mockRejectedValue(new Error('Connection refused'));
			repo.findActiveByEvent.mockResolvedValue([mockWebhook()]);

			const event: WebhookEvent = {
				type: 'sanction.created',
				timestamp: '2026-01-01T00:00:00Z',
				data: {},
			};

			await expect(service.dispatch(event)).resolves.toBeUndefined();
		});

		it('should dispatch to multiple webhooks in parallel', async () => {
			const webhooks = [
				mockWebhook({ id: 'wh-1', url: 'https://example.com/hook1' }),
				mockWebhook({ id: 'wh-2', url: 'https://example.com/hook2' }),
			];
			repo.findActiveByEvent.mockResolvedValue(webhooks);

			const event: WebhookEvent = {
				type: 'sanction.created',
				timestamp: '2026-01-01T00:00:00Z',
				data: {},
			};

			await service.dispatch(event);

			expect(fetchSpy).toHaveBeenCalledTimes(2);
		});

		it('should not call fetch when no webhooks match', async () => {
			repo.findActiveByEvent.mockResolvedValue([]);

			const event: WebhookEvent = {
				type: 'sanction.created',
				timestamp: '2026-01-01T00:00:00Z',
				data: {},
			};

			await service.dispatch(event);

			expect(fetchSpy).not.toHaveBeenCalled();
		});
	});
});
