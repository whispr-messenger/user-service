import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { buildRedisOptions } from '../../../config/redis.config';
import { USER_REGISTERED_PATTERN, UserRegisteredEvent } from '../../shared/events';
import { AccountsService } from './accounts.service';

const STREAM = `stream:${USER_REGISTERED_PATTERN}`;
const GROUP = 'user-service';
const READ_COUNT = 16;
const BLOCK_MS = 5000;
const ERROR_BACKOFF_MS = 1000;

/**
 * Consumes `user.registered` events from a Redis Stream consumer group.
 *
 * Replaces the old Pub/Sub `@EventPattern` handler: Streams persist messages
 * until explicitly acknowledged, so events are not lost if the pod is down
 * when the producer emits. On startup this consumer drains its pending entries
 * list (messages read by a previous instance of the same consumer name that
 * crashed before XACK) before entering the blocking read loop.
 */
@Injectable()
export class UserRegisteredStreamConsumer implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(UserRegisteredStreamConsumer.name);
	private readonly consumerName = process.env.HOSTNAME || `user-service-${process.pid}`;
	private redis!: Redis;
	private running = false;
	private loopPromise: Promise<void> | null = null;

	constructor(
		private readonly configService: ConfigService,
		private readonly accountsService: AccountsService
	) {}

	async onModuleInit(): Promise<void> {
		if (process.env.NODE_ENV === 'test') {
			// Unit/e2e tests instantiate the module without real Redis. The consumer
			// is exercised directly via its public methods in *.spec.ts.
			return;
		}
		const options = buildRedisOptions(this.configService);
		const redisStreamDb = this.configService.get<string>('REDIS_STREAM_DB');
		const parsedRedisStreamDb = redisStreamDb !== undefined ? Number.parseInt(redisStreamDb, 10) : 0;
		options.db = Number.isNaN(parsedRedisStreamDb) ? 0 : parsedRedisStreamDb;
		options.lazyConnect = false;
		this.redis = new Redis(options);
		this.redis.on('error', (err) => {
			this.logger.error('Redis stream consumer connection error', err.stack);
		});

		await this.ensureGroup();
		this.running = true;
		await this.drainPending();
		this.loopPromise = this.consumeLoop();
	}

	async onModuleDestroy(): Promise<void> {
		this.running = false;
		if (this.loopPromise !== null) {
			await this.loopPromise.catch(() => undefined);
		}
		if (this.redis) {
			try {
				await this.redis.quit();
			} catch {
				this.redis.disconnect();
			}
		}
	}

	/**
	 * Create the consumer group if it does not already exist.
	 * Uses MKSTREAM so the stream is materialised even before the first XADD.
	 */
	async ensureGroup(client: Redis = this.redis): Promise<void> {
		try {
			await client.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM');
			this.logger.log(`Consumer group '${GROUP}' created on '${STREAM}'`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('BUSYGROUP')) {
				this.logger.debug(`Consumer group '${GROUP}' already exists on '${STREAM}'`);
				return;
			}
			throw err;
		}
	}

	/**
	 * Read messages that were delivered to this consumer name before a crash
	 * but never acknowledged. Reads with id='0' target the consumer's own PEL.
	 * Loops until the PEL is empty so a backlog is fully cleared before we
	 * switch to the blocking read for new entries.
	 */
	async drainPending(client: Redis = this.redis): Promise<void> {
		while (this.running || client !== this.redis) {
			const result = (await client.xreadgroup(
				'GROUP',
				GROUP,
				this.consumerName,
				'COUNT',
				READ_COUNT,
				'STREAMS',
				STREAM,
				'0'
			)) as RawStreamRead | null;

			const messages = extractMessages(result);
			if (messages.length === 0) {
				return;
			}
			await this.processMessages(messages, client);
			if (client !== this.redis) {
				// In tests we don't loop; one call is enough
				return;
			}
		}
	}

	private async consumeLoop(): Promise<void> {
		while (this.running) {
			try {
				const result = (await this.redis.xreadgroup(
					'GROUP',
					GROUP,
					this.consumerName,
					'COUNT',
					READ_COUNT,
					'BLOCK',
					BLOCK_MS,
					'STREAMS',
					STREAM,
					'>'
				)) as RawStreamRead | null;

				const messages = extractMessages(result);
				if (messages.length > 0) {
					await this.processMessages(messages, this.redis);
				}
			} catch (err) {
				if (!this.running) {
					return;
				}
				this.logger.error('XREADGROUP failed, retrying after backoff', err);
				await new Promise((resolve) => globalThis.setTimeout(resolve, ERROR_BACKOFF_MS));
			}
		}
	}

	/**
	 * Process a batch of messages read from the stream. Messages that are
	 * successfully handled are XACKed; a failure leaves the message in the
	 * pending entries list so it can be retried on the next `drainPending`
	 * run (typically on pod restart).
	 */
	async processMessages(messages: StreamMessage[], client: Redis = this.redis): Promise<void> {
		for (const [id, fields] of messages) {
			try {
				const event = parseUserRegisteredFields(fields);
				await this.accountsService.createFromEvent(event);
				await client.xack(STREAM, GROUP, id);
				this.logger.log(`XACK ${id} userId=${event.userId}`);
			} catch (err) {
				this.logger.error(
					`Failed to process ${id}; leaving pending for retry`,
					err instanceof Error ? err.stack : String(err)
				);
			}
		}
	}
}

// ---- helpers (exported for tests) ----

export type StreamMessage = [id: string, fields: string[]];
type RawStreamRead = Array<[stream: string, messages: StreamMessage[]]>;

export function extractMessages(result: RawStreamRead | null): StreamMessage[] {
	if (!result || result.length === 0) return [];
	const entry = result[0];
	if (!entry || !Array.isArray(entry[1])) return [];
	return entry[1];
}

export function parseUserRegisteredFields(fields: string[]): UserRegisteredEvent {
	const data: Record<string, string> = {};
	for (let i = 0; i + 1 < fields.length; i += 2) {
		data[fields[i]] = fields[i + 1];
	}
	if (!data.userId || !data.phoneNumber) {
		throw new Error(`Invalid user.registered fields: ${JSON.stringify(data)}`);
	}
	// The producer JSON-stringifies non-string values, so timestamp arrives
	// quoted (e.g. '"2026-04-21T…"'). Strip the JSON wrapper before building
	// the Date; fall back to `now` when the field is missing or malformed.
	let timestamp = new Date();
	if (data.timestamp) {
		const parsed = tryParseJson(data.timestamp);
		const date = new Date(parsed ?? data.timestamp);
		if (!Number.isNaN(date.getTime())) {
			timestamp = date;
		}
	}
	return new UserRegisteredEvent(data.userId, data.phoneNumber, timestamp);
}

function tryParseJson(value: string): string | null {
	try {
		const parsed = JSON.parse(value);
		return typeof parsed === 'string' ? parsed : null;
	} catch {
		return null;
	}
}
