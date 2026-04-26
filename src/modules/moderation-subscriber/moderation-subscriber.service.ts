import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { buildRedisOptions } from '../../config/redis.config';
import { ConfigService } from '@nestjs/config';
import { withStreamLogging } from '../../interceptors/stream-event.logging';
import { SanctionsService } from '../sanctions/services/sanctions.service';
import { AuditService } from '../audit/services/audit.service';

const CHANNEL = 'whispr:moderation:threshold_reached';
const SYSTEM_ACTOR = 'system';
const TEMP_BAN_DAYS = 7;

interface ThresholdPayload {
	event: string;
	reported_user_id: string;
	threshold_level: 'auto_mute' | 'temp_ban' | 'permanent_review';
	report_count: number;
}

@Injectable()
export class ModerationSubscriberService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(ModerationSubscriberService.name);
	private subscriber: Redis | null = null;

	constructor(
		private readonly configService: ConfigService,
		private readonly sanctionsService: SanctionsService,
		private readonly auditService: AuditService
	) {}

	async onModuleInit(): Promise<void> {
		try {
			const options = buildRedisOptions(this.configService);
			this.subscriber = new Redis(options);

			this.subscriber.on('error', (err) => {
				this.logger.error('Redis subscriber connection error', err);
			});

			this.subscriber.on('connect', () => {
				this.logger.log('Redis subscriber connected');
			});

			await this.subscriber.subscribe(CHANNEL);
			this.logger.log(`Subscribed to ${CHANNEL}`);

			this.subscriber.on('message', (channel, message) => {
				if (channel === CHANNEL) {
					this.handleMessage(message).catch((err) => {
						this.logger.error('Error handling threshold message', err);
					});
				}
			});
		} catch (err) {
			this.logger.error('Failed to initialize Redis subscriber', err);
		}
	}

	async onModuleDestroy(): Promise<void> {
		if (this.subscriber) {
			await this.subscriber.unsubscribe(CHANNEL);
			await this.subscriber.quit();
			this.subscriber = null;
		}
	}

	async handleMessage(raw: string): Promise<void> {
		let payload: ThresholdPayload;

		try {
			payload = JSON.parse(raw);
		} catch {
			this.logger.warn(`Invalid JSON on ${CHANNEL}: ${raw}`);
			return;
		}

		if (payload.event !== 'threshold_reached' || !payload.reported_user_id || !payload.threshold_level) {
			this.logger.warn(`Ignoring malformed payload: ${raw}`);
			return;
		}

		const { reported_user_id, threshold_level, report_count } = payload;

		try {
			await withStreamLogging(
				{
					eventName: payload.event,
					channel: CHANNEL,
					messageId: reported_user_id,
				},
				async () => {
					// Check if user already has an active sanction of the target type to avoid duplicates
					const sanctionType =
						threshold_level === 'auto_mute'
							? 'warning'
							: threshold_level === 'temp_ban'
								? 'temp_ban'
								: 'warning';
					const existing = await this.sanctionsService.getMySanctions(reported_user_id);
					const hasActiveSanction = existing.some((s) => s.active && s.type === sanctionType);
					if (hasActiveSanction) {
						this.logger.log(
							`User ${reported_user_id} already has active ${sanctionType}, skipping`
						);
						return;
					}

					switch (threshold_level) {
						case 'auto_mute': {
							const reason = `Auto-escalation: ${report_count} reports received`;
							const sanction = await this.sanctionsService.createAutoSanction(
								reported_user_id,
								'warning',
								reason
							);
							await this.auditService.log(
								SYSTEM_ACTOR,
								'auto_sanction_warning',
								'user',
								reported_user_id,
								{
									sanction_id: sanction.id,
									threshold_level,
									report_count,
								}
							);
							this.logger.log(`Warning sanction created for user ${reported_user_id}`);
							break;
						}

						case 'temp_ban': {
							const expiresAt = new Date();
							expiresAt.setDate(expiresAt.getDate() + TEMP_BAN_DAYS);
							const reason = `Auto-escalation: ${report_count} reports received - temporary ban (${TEMP_BAN_DAYS} days)`;
							const sanction = await this.sanctionsService.createAutoSanction(
								reported_user_id,
								'temp_ban',
								reason,
								expiresAt
							);
							await this.auditService.log(
								SYSTEM_ACTOR,
								'auto_sanction_temp_ban',
								'user',
								reported_user_id,
								{
									sanction_id: sanction.id,
									threshold_level,
									report_count,
									expires_at: expiresAt.toISOString(),
								}
							);
							this.logger.log(
								`Temp ban sanction created for user ${reported_user_id} (expires ${expiresAt.toISOString()})`
							);
							break;
						}

						case 'permanent_review': {
							const reason = `Auto-escalation: ${report_count} reports received - flagged for admin review (permanent ban consideration)`;
							const sanction = await this.sanctionsService.createAutoSanction(
								reported_user_id,
								'warning',
								reason
							);
							await this.auditService.log(
								SYSTEM_ACTOR,
								'auto_sanction_permanent_review',
								'user',
								reported_user_id,
								{
									sanction_id: sanction.id,
									threshold_level,
									report_count,
									requires_admin_review: true,
								}
							);
							this.logger.log(`Permanent review warning created for user ${reported_user_id}`);
							break;
						}

						default:
							this.logger.warn(`Unknown threshold_level: ${threshold_level}`);
					}
				}
			);
		} catch {
			// withStreamLogging a déjà tracé "Failed ..."; le Pub/Sub n'a pas de replay,
			// on absorbe l'erreur pour ne pas tuer le subscriber sur le message suivant.
		}
	}
}
