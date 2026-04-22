import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppealsRepository } from '../appeals/repositories/appeals.repository';
import { AuditRepository } from '../audit/repositories/audit.repository';
import { APPEALS_RETENTION_DAYS, AUDIT_LOG_RETENTION_DAYS, cutoffDate } from './retention.constants';

/**
 * GDPR data retention — WHISPR-1057.
 *
 * Runs once a day at 03:00 UTC (chosen to avoid the daily quota-reset job at
 * 02:00 and the prometheus scrape window). Deletes rows whose policy TTL has
 * expired.
 *
 * Current policy:
 *   - resolved appeals (accepted / rejected) → 1 year after `resolved_at`
 *   - audit logs                              → 5 years after `created_at`
 *
 * Pending / under-review appeals are NEVER deleted by this job — they stay
 * until a moderator reviews them. Active sanctions are also out of scope;
 * they have their own `SanctionExpiryService` that flips `active=false`
 * based on `expires_at`.
 */
@Injectable()
export class GdprRetentionService {
	private readonly logger = new Logger(GdprRetentionService.name);

	constructor(
		private readonly appealsRepository: AppealsRepository,
		private readonly auditRepository: AuditRepository
	) {}

	@Cron(CronExpression.EVERY_DAY_AT_3AM)
	async handleRetention(): Promise<void> {
		this.logger.log('Running GDPR retention purge');
		const summary = await this.runOnce();
		this.logger.log(
			`GDPR retention purge complete: appeals=${summary.appealsPurged}, audit_logs=${summary.auditLogsPurged}`
		);
	}

	/**
	 * Exposed for on-demand runs (manual trigger, tests). Does not schedule
	 * itself — the caller is responsible for the cadence.
	 */
	async runOnce(now: Date = new Date()): Promise<{
		appealsPurged: number;
		auditLogsPurged: number;
	}> {
		const appealsCutoff = cutoffDate(APPEALS_RETENTION_DAYS, now);
		const auditCutoff = cutoffDate(AUDIT_LOG_RETENTION_DAYS, now);

		const [appealsPurged, auditLogsPurged] = await Promise.all([
			this.safePurge(() => this.appealsRepository.deleteResolvedBefore(appealsCutoff), 'appeals'),
			this.safePurge(() => this.auditRepository.deleteOlderThan(auditCutoff), 'audit_logs'),
		]);

		return { appealsPurged, auditLogsPurged };
	}

	private async safePurge(fn: () => Promise<number>, tag: string): Promise<number> {
		try {
			return await fn();
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.logger.error(`Retention purge for ${tag} failed: ${message}`);
			return 0;
		}
	}
}
