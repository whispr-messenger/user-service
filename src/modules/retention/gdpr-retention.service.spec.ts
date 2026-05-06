import { Test, TestingModule } from '@nestjs/testing';
import { GdprRetentionService } from './gdpr-retention.service';
import { AppealsRepository } from '../appeals/repositories/appeals.repository';
import { AuditRepository } from '../audit/repositories/audit.repository';
import { APPEALS_RETENTION_DAYS, AUDIT_LOG_RETENTION_DAYS, cutoffDate } from './retention.constants';

describe('GdprRetentionService (WHISPR-1057)', () => {
	let service: GdprRetentionService;
	let appealsRepository: jest.Mocked<AppealsRepository>;
	let auditRepository: jest.Mocked<AuditRepository>;

	const NOW = new Date('2026-04-22T03:00:00.000Z');

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GdprRetentionService,
				{
					provide: AppealsRepository,
					useValue: { deleteResolvedBefore: jest.fn() },
				},
				{
					provide: AuditRepository,
					useValue: { deleteOlderThan: jest.fn() },
				},
			],
		}).compile();

		service = module.get(GdprRetentionService);
		appealsRepository = module.get(AppealsRepository);
		auditRepository = module.get(AuditRepository);
	});

	it('passes the expected cutoffs (1 year / 5 years) to each repository', async () => {
		appealsRepository.deleteResolvedBefore.mockResolvedValue(0);
		auditRepository.deleteOlderThan.mockResolvedValue(0);

		await service.runOnce(NOW);

		expect(appealsRepository.deleteResolvedBefore).toHaveBeenCalledWith(
			cutoffDate(APPEALS_RETENTION_DAYS, NOW)
		);
		expect(auditRepository.deleteOlderThan).toHaveBeenCalledWith(
			cutoffDate(AUDIT_LOG_RETENTION_DAYS, NOW)
		);
	});

	it('returns the aggregated counts', async () => {
		appealsRepository.deleteResolvedBefore.mockResolvedValue(7);
		auditRepository.deleteOlderThan.mockResolvedValue(42);

		const result = await service.runOnce(NOW);

		expect(result).toEqual({ appealsPurged: 7, auditLogsPurged: 42 });
	});

	it('does not cancel the audit purge when the appeals purge throws', async () => {
		appealsRepository.deleteResolvedBefore.mockRejectedValue(new Error('pg boom'));
		auditRepository.deleteOlderThan.mockResolvedValue(3);

		const result = await service.runOnce(NOW);

		expect(result).toEqual({ appealsPurged: 0, auditLogsPurged: 3 });
	});

	it('does not cancel the appeals purge when the audit purge throws', async () => {
		appealsRepository.deleteResolvedBefore.mockResolvedValue(5);
		auditRepository.deleteOlderThan.mockRejectedValue(new Error('pg boom'));

		const result = await service.runOnce(NOW);

		expect(result).toEqual({ appealsPurged: 5, auditLogsPurged: 0 });
	});

	it('exposes handleRetention() as the cron entrypoint that wraps runOnce', async () => {
		appealsRepository.deleteResolvedBefore.mockResolvedValue(1);
		auditRepository.deleteOlderThan.mockResolvedValue(2);

		await expect(service.handleRetention()).resolves.toBeUndefined();
		expect(appealsRepository.deleteResolvedBefore).toHaveBeenCalled();
		expect(auditRepository.deleteOlderThan).toHaveBeenCalled();
	});
});

describe('cutoffDate', () => {
	it('subtracts the requested number of days in UTC', () => {
		const now = new Date('2026-04-22T03:00:00.000Z');
		const cutoff = cutoffDate(365, now);
		expect(cutoff.toISOString()).toBe('2025-04-22T03:00:00.000Z');
	});

	it('handles leap-year boundaries without drifting', () => {
		const now = new Date('2024-03-01T00:00:00.000Z');
		const cutoff = cutoffDate(1, now);
		expect(cutoff.toISOString()).toBe('2024-02-29T00:00:00.000Z');
	});
});
