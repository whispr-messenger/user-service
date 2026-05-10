import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { buildRedisOptions } from '../../../config/redis.config';

export interface ContactRequestReceivedPayload {
	user_id: string;
	requester_id: string;
	requester_display_name?: string | null;
	request_id?: string;
}

export interface ContactRequestAcceptedPayload {
	user_id: string;
	accepter_id: string;
	accepter_display_name?: string | null;
	request_id?: string;
}

const REQUEST_RECEIVED_CHANNEL = 'whispr:contacts:request_received';
const REQUEST_ACCEPTED_CHANNEL = 'whispr:contacts:request_accepted';
const INBOX_CHANNEL = 'whispr:notifications:inbox';

export interface InboxContactRequestPayload {
	user_id: string;
	event_type: 'contact_request';
	payload: {
		from_user_id: string;
		from_username: string | null;
		request_id: string;
	};
}

/**
 * Publishes contact-related events to Redis pub/sub for the
 * notification-service to consume and dispatch FCM/APNS pushes.
 *
 * Failures are logged but never thrown — push delivery is best-effort
 * and must not break the underlying contact-request flow (the DB row
 * has already been committed when we publish).
 */
@Injectable()
export class ContactsNotificationPublisher implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(ContactsNotificationPublisher.name);
	private publisher: Redis | null = null;

	constructor(private readonly configService: ConfigService) {}

	async onModuleInit(): Promise<void> {
		try {
			this.publisher = new Redis(buildRedisOptions(this.configService));
			this.publisher.on('error', (err) => {
				this.logger.error('Redis publisher connection error', err);
			});
		} catch (err) {
			this.logger.error('Failed to initialize Redis publisher', err);
			this.publisher = null;
		}
	}

	async onModuleDestroy(): Promise<void> {
		if (this.publisher) {
			await this.publisher.quit();
			this.publisher = null;
		}
	}

	async publishRequestReceived(payload: ContactRequestReceivedPayload): Promise<void> {
		await this.publish(REQUEST_RECEIVED_CHANNEL, payload);
	}

	async publishRequestAccepted(payload: ContactRequestAcceptedPayload): Promise<void> {
		await this.publish(REQUEST_ACCEPTED_CHANNEL, payload);
	}

	async publishInboxContactRequest(payload: InboxContactRequestPayload): Promise<void> {
		await this.publish(INBOX_CHANNEL, payload);
	}

	private async publish(channel: string, payload: unknown): Promise<void> {
		if (!this.publisher) {
			this.logger.warn(`Redis publisher unavailable; skipping ${channel}`);
			return;
		}

		try {
			await this.publisher.publish(channel, JSON.stringify(payload));
		} catch (err) {
			this.logger.error(`Failed to publish on ${channel}`, err);
		}
	}
}
