import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ModerationSubscriberService } from './moderation-subscriber.service';
import { SanctionsService } from '../sanctions/services/sanctions.service';
import { AuditService } from '../audit/services/audit.service';

jest.mock('ioredis', () => {
	const handlers: Record<string, (...args: any[]) => void> = {};
	const MockRedis = jest.fn().mockImplementation(() => ({
		on: jest.fn((event: string, cb: (...args: any[]) => void) => {
			handlers[event] = cb;
		}),
		subscribe: jest.fn().mockResolvedValue(undefined),
		unsubscribe: jest.fn().mockResolvedValue(undefined),
		quit: jest.fn().mockResolvedValue(undefined),
		_handlers: handlers,
	}));
	return { default: MockRedis, __esModule: true };
});

describe('ModerationSubscriberService', () => {
	let service: ModerationSubscriberService;
	let sanctionsService: jest.Mocked<SanctionsService>;
	let auditService: jest.Mocked<AuditService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ModerationSubscriberService,
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn((key: string, fallback?: string) => {
							const map: Record<string, string> = {
								REDIS_MODE: 'direct',
								REDIS_HOST: 'localhost',
								REDIS_PORT: '6379',
								REDIS_DB: '0',
							};
							return map[key] ?? fallback;
						}),
					},
				},
				{
					provide: SanctionsService,
					useValue: {
						getMySanctions: jest.fn().mockResolvedValue([]),
						createAutoSanction: jest.fn().mockResolvedValue({ id: 'sanction-1' }),
					},
				},
				{
					provide: AuditService,
					useValue: {
						log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
					},
				},
			],
		}).compile();

		service = module.get<ModerationSubscriberService>(ModerationSubscriberService);
		sanctionsService = module.get(SanctionsService);
		auditService = module.get(AuditService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('handleMessage', () => {
		it('should create a warning sanction for auto_mute threshold', async () => {
			const payload = JSON.stringify({
				event: 'threshold_reached',
				reported_user_id: 'user-123',
				threshold_level: 'auto_mute',
				report_count: 5,
			});

			await service.handleMessage(payload);

			expect(sanctionsService.createAutoSanction).toHaveBeenCalledWith(
				'user-123',
				'warning',
				'Auto-escalation: 5 reports received'
			);
			expect(auditService.log).toHaveBeenCalledWith(
				'system',
				'auto_sanction_warning',
				'user',
				'user-123',
				expect.objectContaining({
					threshold_level: 'auto_mute',
					report_count: 5,
				})
			);
		});

		it('should create a temp_ban sanction with 7-day expiry for temp_ban threshold', async () => {
			const payload = JSON.stringify({
				event: 'threshold_reached',
				reported_user_id: 'user-456',
				threshold_level: 'temp_ban',
				report_count: 10,
			});

			await service.handleMessage(payload);

			expect(sanctionsService.createAutoSanction).toHaveBeenCalledWith(
				'user-456',
				'temp_ban',
				expect.stringContaining('temporary ban (7 days)'),
				expect.any(Date)
			);

			const expiresAt = sanctionsService.createAutoSanction.mock.calls[0][3] as Date;
			const now = new Date();
			const diffDays = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
			expect(diffDays).toBe(7);

			expect(auditService.log).toHaveBeenCalledWith(
				'system',
				'auto_sanction_temp_ban',
				'user',
				'user-456',
				expect.objectContaining({
					threshold_level: 'temp_ban',
					report_count: 10,
					expires_at: expect.any(String),
				})
			);
		});

		it('should create a warning sanction for permanent_review threshold (no auto-ban)', async () => {
			const payload = JSON.stringify({
				event: 'threshold_reached',
				reported_user_id: 'user-789',
				threshold_level: 'permanent_review',
				report_count: 20,
			});

			await service.handleMessage(payload);

			expect(sanctionsService.createAutoSanction).toHaveBeenCalledWith(
				'user-789',
				'warning',
				expect.stringContaining('flagged for admin review')
			);
			expect(auditService.log).toHaveBeenCalledWith(
				'system',
				'auto_sanction_permanent_review',
				'user',
				'user-789',
				expect.objectContaining({
					threshold_level: 'permanent_review',
					report_count: 20,
					requires_admin_review: true,
				})
			);
		});

		it('should ignore invalid JSON gracefully', async () => {
			await expect(service.handleMessage('not-json')).resolves.toBeUndefined();
			expect(sanctionsService.createAutoSanction).not.toHaveBeenCalled();
		});

		it('should ignore payloads with wrong event type', async () => {
			const payload = JSON.stringify({
				event: 'something_else',
				reported_user_id: 'user-1',
				threshold_level: 'auto_mute',
				report_count: 3,
			});

			await service.handleMessage(payload);
			expect(sanctionsService.createAutoSanction).not.toHaveBeenCalled();
		});

		it('should ignore payloads missing reported_user_id', async () => {
			const payload = JSON.stringify({
				event: 'threshold_reached',
				threshold_level: 'auto_mute',
				report_count: 3,
			});

			await service.handleMessage(payload);
			expect(sanctionsService.createAutoSanction).not.toHaveBeenCalled();
		});

		it('should ignore payloads missing threshold_level', async () => {
			const payload = JSON.stringify({
				event: 'threshold_reached',
				reported_user_id: 'user-1',
				report_count: 3,
			});

			await service.handleMessage(payload);
			expect(sanctionsService.createAutoSanction).not.toHaveBeenCalled();
		});

		it('should handle SanctionsService errors without throwing', async () => {
			sanctionsService.createAutoSanction.mockRejectedValueOnce(new Error('DB down'));

			const payload = JSON.stringify({
				event: 'threshold_reached',
				reported_user_id: 'user-1',
				threshold_level: 'auto_mute',
				report_count: 5,
			});

			await expect(service.handleMessage(payload)).resolves.toBeUndefined();
		});

		it('should handle unknown threshold_level gracefully', async () => {
			const payload = JSON.stringify({
				event: 'threshold_reached',
				reported_user_id: 'user-1',
				threshold_level: 'unknown_level',
				report_count: 5,
			});

			await service.handleMessage(payload);
			expect(sanctionsService.createAutoSanction).not.toHaveBeenCalled();
		});
	});
});
