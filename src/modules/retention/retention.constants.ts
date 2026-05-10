/**
 * GDPR data retention TTLs (WHISPR-1057).
 *
 * Aligned with the internal privacy policy — raise these values via config
 * override in prod if legal ever tightens the floor. Keep them as Day units
 * so the Jira description and the code stay in sync.
 */

export const APPEALS_RETENTION_DAYS = 365; // 1 year after resolution
export const AUDIT_LOG_RETENTION_DAYS = 365 * 5; // 5 years after creation

/**
 * Returns the absolute cutoff: any row with a timestamp strictly older than
 * this date is eligible for deletion.
 */
export function cutoffDate(days: number, now: Date = new Date()): Date {
	const cutoff = new Date(now);
	cutoff.setUTCDate(cutoff.getUTCDate() - days);
	return cutoff;
}
