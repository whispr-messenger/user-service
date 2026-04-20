import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfig } from '../../../config/redis.config';
import { AccountsService } from './accounts.service';
import { USER_REGISTERED_PATTERN } from '../../shared/events';

const STREAM = `stream:${USER_REGISTERED_PATTERN}`;
const GROUP = 'user-service';
const CONSUMER = process.env.HOSTNAME || `consumer-${process.pid}`;

/**
 * Consumes `stream:user.registered` messages via a Redis Streams consumer group.
 *
 * Advantages over the previous Pub/Sub approach:
 * - Messages are persisted until acknowledged (XACK)
 * - If this pod is down when a message is published, it will be delivered on restart
 * - Multiple pods share the load via the consumer group (each message delivered once)
 */
@Injectable()
export class UserRegisteredStreamConsumer implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(UserRegisteredStreamConsumer.name);
	private readonly redis: Redis;
	private running = true;

	constructor(
		private readonly accountsService: AccountsService,
		redisConfig: RedisConfig
	) {
		// Create a dedicated connection for blocking reads (XREADGROUP BLOCK)
		this.redis = redisConfig.getClient().duplicate();
	}

	async onModuleInit() {
		await this.ensureConsumerGroup();
		await this.processPending();
		this.consumeLoop();
	}

	onModuleDestroy() {
		this.running = false;
		this.redis.disconnect();
	}

	private async ensureConsumerGroup(): Promise<void> {
		try {
			await this.redis.xgroup('CREATE', STREAM, GROUP, '0', 'MKSTREAM');
			this.logger.log(`Created consumer group "${GROUP}" on stream "${STREAM}"`);
		} catch (err: any) {
			if (err?.message?.includes('BUSYGROUP')) {
				this.logger.debug(`Consumer group "${GROUP}" already exists`);
			} else {
				throw err;
			}
		}
	}

	/**
	 * Process messages that were delivered but never acknowledged (e.g. after a crash).
	 */
	private async processPending(): Promise<void> {
		const entries = (await this.redis.xreadgroup(
			'GROUP',
			GROUP,
			CONSUMER,
			'COUNT',
			'100',
			'STREAMS',
			STREAM,
			'0'
		)) as [string, [string, string[]][]][] | null;

		if (!entries || entries.length === 0) return;

		for (const [, messages] of entries) {
			for (const [id, fields] of messages) {
				if (fields.length === 0) continue; // already acked placeholder
				await this.processMessage(id, fields);
			}
		}
	}

	/**
	 * Main consumption loop — blocks for up to 5s waiting for new messages.
	 */
	private async consumeLoop(): Promise<void> {
		while (this.running) {
			try {
				const entries = (await this.redis.call(
					'XREADGROUP',
					'GROUP',
					GROUP,
					CONSUMER,
					'BLOCK',
					'5000',
					'COUNT',
					'10',
					'STREAMS',
					STREAM,
					'>'
				)) as [string, [string, string[]][]][] | null;

				if (!entries || entries.length === 0) continue;

				for (const [, messages] of entries) {
					for (const [id, fields] of messages) {
						await this.processMessage(id, fields);
					}
				}
			} catch (err: any) {
				if (!this.running) break;
				this.logger.error(`Stream consumer error: ${err.message}`, err.stack);
				await this.sleep(2000);
			}
		}
	}

	private async processMessage(id: string, fields: string[]): Promise<void> {
		const data = this.fieldsToObject(fields);

		if (!data.userId || !data.phoneNumber) {
			this.logger.warn(`Malformed message ${id}, acking to skip: ${JSON.stringify(data)}`);
			await this.redis.xack(STREAM, GROUP, id);
			return;
		}

		try {
			await this.accountsService.createFromEvent({
				userId: data.userId,
				phoneNumber: data.phoneNumber,
				timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
			});
			await this.redis.xack(STREAM, GROUP, id);
			this.logger.log(`Processed and acked message ${id} for user ${data.userId}`);
		} catch (err: any) {
			// Don't XACK — the message stays in the pending list for retry
			this.logger.error(`Failed to process message ${id} for user ${data.userId}: ${err.message}`);
		}
	}

	private fieldsToObject(fields: string[]): Record<string, string> {
		const obj: Record<string, string> = {};
		for (let i = 0; i < fields.length; i += 2) {
			obj[fields[i]] = fields[i + 1];
		}
		return obj;
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
	}
}
