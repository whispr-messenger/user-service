import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AccountsService } from './accounts.service';
import {
	UserRegisteredStreamConsumer,
	extractMessages,
	parseUserRegisteredFields,
	StreamMessage,
} from './user-registered-stream.consumer';
import { UserRegisteredEvent } from '../../shared/events';

const STREAM = 'stream:user.registered';
const GROUP = 'user-service';

const makeAccountsService = (): jest.Mocked<Pick<AccountsService, 'createFromEvent'>> => ({
	createFromEvent: jest.fn(),
});

const makeRedis = () => ({
	xgroup: jest.fn(),
	xreadgroup: jest.fn(),
	xack: jest.fn(),
	quit: jest.fn(),
	disconnect: jest.fn(),
	on: jest.fn(),
});

describe('parseUserRegisteredFields', () => {
	it('builds a UserRegisteredEvent from producer-shaped fields', () => {
		const fields = [
			'userId',
			'uuid-1',
			'phoneNumber',
			'+33600000001',
			'timestamp',
			'"2026-04-21T10:00:00.000Z"',
		];

		const event = parseUserRegisteredFields(fields);

		expect(event).toBeInstanceOf(UserRegisteredEvent);
		expect(event.userId).toBe('uuid-1');
		expect(event.phoneNumber).toBe('+33600000001');
		expect(event.timestamp.toISOString()).toBe('2026-04-21T10:00:00.000Z');
	});

	it('falls back to now when timestamp is missing', () => {
		const before = Date.now();
		const event = parseUserRegisteredFields(['userId', 'uuid-1', 'phoneNumber', '+33600000001']);
		const after = Date.now();

		expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before);
		expect(event.timestamp.getTime()).toBeLessThanOrEqual(after);
	});

	it('accepts an unquoted timestamp string', () => {
		const event = parseUserRegisteredFields([
			'userId',
			'uuid-1',
			'phoneNumber',
			'+33600000001',
			'timestamp',
			'2026-04-21T10:00:00.000Z',
		]);

		expect(event.timestamp.toISOString()).toBe('2026-04-21T10:00:00.000Z');
	});

	it('throws when userId is missing', () => {
		expect(() => parseUserRegisteredFields(['phoneNumber', '+33600000001'])).toThrow(
			/Invalid user.registered/
		);
	});

	it('throws when phoneNumber is missing', () => {
		expect(() => parseUserRegisteredFields(['userId', 'uuid-1'])).toThrow(/Invalid user.registered/);
	});
});

describe('extractMessages', () => {
	it('returns [] when result is null', () => {
		expect(extractMessages(null)).toEqual([]);
	});

	it('returns [] when result is empty', () => {
		expect(extractMessages([])).toEqual([]);
	});

	it('returns the messages array from the first stream entry', () => {
		const messages: StreamMessage[] = [['1-0', ['userId', 'a', 'phoneNumber', '+33600000001']]];
		expect(extractMessages([[STREAM, messages]])).toBe(messages);
	});
});

describe('UserRegisteredStreamConsumer', () => {
	let consumer: UserRegisteredStreamConsumer;
	let accountsService: jest.Mocked<Pick<AccountsService, 'createFromEvent'>>;
	let redis: ReturnType<typeof makeRedis>;

	beforeEach(async () => {
		accountsService = makeAccountsService();
		redis = makeRedis();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UserRegisteredStreamConsumer,
				{ provide: AccountsService, useFactory: () => accountsService },
				{ provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(0) } },
			],
		}).compile();

		consumer = module.get(UserRegisteredStreamConsumer);
	});

	describe('ensureGroup', () => {
		it('creates the consumer group with MKSTREAM', async () => {
			redis.xgroup.mockResolvedValue('OK');

			await consumer.ensureGroup(redis as any);

			expect(redis.xgroup).toHaveBeenCalledWith('CREATE', STREAM, GROUP, '$', 'MKSTREAM');
		});

		it('swallows BUSYGROUP when the group already exists', async () => {
			redis.xgroup.mockRejectedValue(new Error('BUSYGROUP Consumer Group name already exists'));

			await expect(consumer.ensureGroup(redis as any)).resolves.toBeUndefined();
		});

		it('rethrows non-BUSYGROUP errors', async () => {
			redis.xgroup.mockRejectedValue(new Error('ECONNREFUSED'));

			await expect(consumer.ensureGroup(redis as any)).rejects.toThrow('ECONNREFUSED');
		});
	});

	describe('processMessages', () => {
		const fields = ['userId', 'uuid-1', 'phoneNumber', '+33600000001'];

		it('XACKs the message when createFromEvent succeeds and returns acked count', async () => {
			accountsService.createFromEvent.mockResolvedValue({ id: 'uuid-1' } as any);

			const acked = await consumer.processMessages([['1-0', fields]], redis as any);

			expect(acked).toBe(1);
			expect(accountsService.createFromEvent).toHaveBeenCalledTimes(1);
			const call = accountsService.createFromEvent.mock.calls[0][0];
			expect(call).toBeInstanceOf(UserRegisteredEvent);
			expect(call.userId).toBe('uuid-1');
			expect(call.phoneNumber).toBe('+33600000001');
			expect(redis.xack).toHaveBeenCalledWith(STREAM, GROUP, '1-0');
		});

		it('does NOT XACK when createFromEvent throws and returns 0 acked', async () => {
			accountsService.createFromEvent.mockRejectedValue(new Error('DB down'));

			const acked = await consumer.processMessages([['1-0', fields]], redis as any);

			expect(acked).toBe(0);
			expect(redis.xack).not.toHaveBeenCalled();
		});

		it('does NOT XACK when the payload is malformed', async () => {
			await consumer.processMessages([['1-0', ['userId', 'uuid-1']]], redis as any);

			expect(accountsService.createFromEvent).not.toHaveBeenCalled();
			expect(redis.xack).not.toHaveBeenCalled();
		});

		it('processes multiple messages in order and XACKs each on success', async () => {
			accountsService.createFromEvent.mockResolvedValue({ id: 'ok' } as any);

			await consumer.processMessages(
				[
					['1-0', ['userId', 'u1', 'phoneNumber', '+33600000001']],
					['2-0', ['userId', 'u2', 'phoneNumber', '+33600000002']],
				],
				redis as any
			);

			expect(accountsService.createFromEvent).toHaveBeenCalledTimes(2);
			expect(redis.xack).toHaveBeenNthCalledWith(1, STREAM, GROUP, '1-0');
			expect(redis.xack).toHaveBeenNthCalledWith(2, STREAM, GROUP, '2-0');
		});

		it('ACKs successful messages even when an earlier one failed', async () => {
			accountsService.createFromEvent
				.mockRejectedValueOnce(new Error('DB down'))
				.mockResolvedValueOnce({ id: 'u2' } as any);

			await consumer.processMessages(
				[
					['1-0', ['userId', 'u1', 'phoneNumber', '+33600000001']],
					['2-0', ['userId', 'u2', 'phoneNumber', '+33600000002']],
				],
				redis as any
			);

			expect(redis.xack).toHaveBeenCalledTimes(1);
			expect(redis.xack).toHaveBeenCalledWith(STREAM, GROUP, '2-0');
		});
	});

	describe('drainPending', () => {
		it('returns immediately when no pending messages exist', async () => {
			redis.xreadgroup.mockResolvedValue(null);

			await consumer.drainPending(redis as any);

			expect(redis.xreadgroup).toHaveBeenCalledTimes(1);
			expect(redis.xack).not.toHaveBeenCalled();
		});

		it('processes a pending batch and XACKs each message', async () => {
			accountsService.createFromEvent.mockResolvedValue({ id: 'ok' } as any);
			redis.xreadgroup.mockResolvedValue([
				[STREAM, [['1-0', ['userId', 'u1', 'phoneNumber', '+33600000001']]]],
			]);

			await consumer.drainPending(redis as any);

			expect(accountsService.createFromEvent).toHaveBeenCalledTimes(1);
			expect(redis.xack).toHaveBeenCalledWith(STREAM, GROUP, '1-0');
		});

		it('gives up after MAX_DRAIN_RETRIES zero-progress iterations', async () => {
			jest.useFakeTimers();

			(consumer as any).redis = redis;
			(consumer as any).running = true;

			redis.xreadgroup.mockResolvedValue([
				[STREAM, [['1-0', ['userId', 'u1', 'phoneNumber', '+33600000001']]]],
			]);
			accountsService.createFromEvent.mockRejectedValue(new Error('DB down'));

			const drainPromise = consumer.drainPending();

			// Advance through all backoff timers
			for (let i = 0; i < 5; i++) {
				await jest.advanceTimersByTimeAsync(16_000);
			}

			await drainPromise;

			expect(redis.xreadgroup).toHaveBeenCalledTimes(5);
			expect(redis.xack).not.toHaveBeenCalled();

			jest.useRealTimers();
		});

		it('resets retry counter when progress is made', async () => {
			jest.useFakeTimers();

			(consumer as any).redis = redis;
			(consumer as any).running = true;

			let callCount = 0;
			redis.xreadgroup.mockImplementation(async () => {
				callCount++;
				if (callCount <= 6) {
					return [[STREAM, [['1-0', ['userId', 'u1', 'phoneNumber', '+33600000001']]]]];
				}
				return null;
			});

			accountsService.createFromEvent
				.mockRejectedValueOnce(new Error('fail'))
				.mockRejectedValueOnce(new Error('fail'))
				.mockRejectedValueOnce(new Error('fail'))
				.mockResolvedValueOnce({ id: 'ok' } as any)
				.mockRejectedValueOnce(new Error('fail'))
				.mockResolvedValueOnce({ id: 'ok' } as any);

			const drainPromise = consumer.drainPending();

			for (let i = 0; i < 10; i++) {
				await jest.advanceTimersByTimeAsync(16_000);
			}

			await drainPromise;

			expect(redis.xreadgroup).toHaveBeenCalledTimes(7);

			jest.useRealTimers();
		});
	});

	describe('lifecycle (onModuleInit / onModuleDestroy)', () => {
		it('skips Redis setup when NODE_ENV is test', async () => {
			const original = process.env.NODE_ENV;
			process.env.NODE_ENV = 'test';

			await consumer.onModuleInit();

			// No redis client was created — running stays false
			expect((consumer as any).running).toBe(false);
			expect((consumer as any).loopPromise).toBeNull();

			process.env.NODE_ENV = original;
		});

		it('onModuleDestroy gracefully shuts down when redis.quit succeeds', async () => {
			(consumer as any).redis = redis;
			(consumer as any).running = true;
			(consumer as any).loopPromise = Promise.resolve();
			redis.quit.mockResolvedValue('OK');

			await consumer.onModuleDestroy();

			expect((consumer as any).running).toBe(false);
			expect(redis.quit).toHaveBeenCalled();
			expect(redis.disconnect).not.toHaveBeenCalled();
		});

		it('onModuleDestroy falls back to disconnect when quit throws', async () => {
			(consumer as any).redis = redis;
			(consumer as any).running = true;
			(consumer as any).loopPromise = Promise.resolve();
			redis.quit.mockRejectedValue(new Error('connection lost'));

			await consumer.onModuleDestroy();

			expect(redis.quit).toHaveBeenCalled();
			expect(redis.disconnect).toHaveBeenCalled();
		});

		it('onModuleDestroy handles null loopPromise', async () => {
			(consumer as any).redis = redis;
			(consumer as any).loopPromise = null;
			redis.quit.mockResolvedValue('OK');

			await consumer.onModuleDestroy();

			expect(redis.quit).toHaveBeenCalled();
		});

		it('onModuleDestroy swallows rejected loopPromise', async () => {
			(consumer as any).redis = redis;
			(consumer as any).running = true;
			(consumer as any).loopPromise = Promise.reject(new Error('loop error'));
			redis.quit.mockResolvedValue('OK');

			await expect(consumer.onModuleDestroy()).resolves.toBeUndefined();
		});
	});

	describe('consumeLoop (via lifecycle)', () => {
		it('processes messages until running is set to false', async () => {
			(consumer as any).redis = redis;
			(consumer as any).running = true;

			let callCount = 0;
			redis.xreadgroup.mockImplementation(async () => {
				callCount++;
				if (callCount === 1) {
					return [[STREAM, [['1-0', ['userId', 'u1', 'phoneNumber', '+33600000001']]]]];
				}
				// On 2nd call, stop the loop
				(consumer as any).running = false;
				return null;
			});
			accountsService.createFromEvent.mockResolvedValue({ id: 'ok' } as any);

			// Start the loop and wait for it to finish
			const loopPromise = (consumer as any).consumeLoop();
			await loopPromise;

			expect(accountsService.createFromEvent).toHaveBeenCalledTimes(1);
			expect(redis.xack).toHaveBeenCalledWith(STREAM, GROUP, '1-0');
		});

		it('retries after backoff when XREADGROUP throws', async () => {
			jest.useFakeTimers();

			(consumer as any).redis = redis;
			(consumer as any).running = true;

			let callCount = 0;
			redis.xreadgroup.mockImplementation(async () => {
				callCount++;
				if (callCount === 1) {
					throw new Error('ECONNRESET');
				}
				(consumer as any).running = false;
				return null;
			});

			const loopPromise = (consumer as any).consumeLoop();
			await jest.advanceTimersByTimeAsync(2000);
			await loopPromise;

			expect(redis.xreadgroup).toHaveBeenCalledTimes(2);

			jest.useRealTimers();
		});

		it('exits immediately on error when running is already false', async () => {
			(consumer as any).redis = redis;
			(consumer as any).running = true;

			redis.xreadgroup.mockImplementation(async () => {
				(consumer as any).running = false;
				throw new Error('connection closed');
			});

			await (consumer as any).consumeLoop();

			expect(redis.xreadgroup).toHaveBeenCalledTimes(1);
		});
	});
});
