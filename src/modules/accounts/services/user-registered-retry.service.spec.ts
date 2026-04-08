import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { UserRegisteredRetryService } from './user-registered-retry.service';
import { AccountsService } from './accounts.service';
import { RedisConfig } from '../../../config/redis.config';
import { UserRegisteredEvent } from '../../shared/events';

const mockAccountsService = (): jest.Mocked<Pick<AccountsService, 'createFromEvent'>> => ({
	createFromEvent: jest.fn(),
});

const mockRedisPush = jest.fn();
const mockRedisConfig = () => ({
	getClient: jest.fn().mockReturnValue({ rpush: mockRedisPush }),
});

describe('UserRegisteredRetryService', () => {
	let service: UserRegisteredRetryService;
	let accountsService: jest.Mocked<Pick<AccountsService, 'createFromEvent'>>;

	const event = new UserRegisteredEvent('uuid-1', '+33600000001');

	beforeEach(async () => {
		jest.useFakeTimers();
		mockRedisPush.mockReset();

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UserRegisteredRetryService,
				{ provide: AccountsService, useFactory: mockAccountsService },
				{ provide: RedisConfig, useFactory: mockRedisConfig },
			],
		}).compile();

		service = module.get<UserRegisteredRetryService>(UserRegisteredRetryService);
		accountsService = module.get(AccountsService);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('resolves immediately on first successful attempt', async () => {
		accountsService.createFromEvent.mockResolvedValue({ id: 'uuid-1' } as any);

		await service.handleWithRetry(event);

		expect(accountsService.createFromEvent).toHaveBeenCalledTimes(1);
		expect(mockRedisPush).not.toHaveBeenCalled();
	});

	it('logs success with attempt number on first successful attempt', async () => {
		accountsService.createFromEvent.mockResolvedValue({ id: 'uuid-1' } as any);
		const logSpy = jest.spyOn(Logger.prototype, 'log');

		await service.handleWithRetry(event);

		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining('user.registered handled successfully for userId=uuid-1 on attempt 1')
		);
	});

	it('retries and succeeds on the second attempt', async () => {
		accountsService.createFromEvent
			.mockRejectedValueOnce(new Error('DB transient error'))
			.mockResolvedValue({ id: 'uuid-1' } as any);

		const handlePromise = service.handleWithRetry(event);
		await jest.runAllTimersAsync();
		await handlePromise;

		expect(accountsService.createFromEvent).toHaveBeenCalledTimes(2);
		expect(mockRedisPush).not.toHaveBeenCalled();
	});

	it('retries and succeeds on the third attempt', async () => {
		accountsService.createFromEvent
			.mockRejectedValueOnce(new Error('DB error 1'))
			.mockRejectedValueOnce(new Error('DB error 2'))
			.mockResolvedValue({ id: 'uuid-1' } as any);

		const handlePromise = service.handleWithRetry(event);
		await jest.runAllTimersAsync();
		await handlePromise;

		expect(accountsService.createFromEvent).toHaveBeenCalledTimes(3);
		expect(mockRedisPush).not.toHaveBeenCalled();
	});

	it('moves event to DLQ after all retries are exhausted', async () => {
		accountsService.createFromEvent.mockRejectedValue(new Error('Persistent DB failure'));
		mockRedisPush.mockResolvedValue(1);

		const handlePromise = service.handleWithRetry(event);
		await jest.runAllTimersAsync();
		await handlePromise;

		expect(accountsService.createFromEvent).toHaveBeenCalledTimes(3);
		expect(mockRedisPush).toHaveBeenCalledTimes(1);

		const [key, entry] = mockRedisPush.mock.calls[0];
		expect(key).toBe('dlq:user.registered');

		const parsed = JSON.parse(entry);
		expect(parsed.event.userId).toBe('uuid-1');
		expect(parsed.error.message).toBe('Persistent DB failure');
		expect(parsed.failedAt).toBeDefined();
	});

	it('does not throw if DLQ write itself fails', async () => {
		accountsService.createFromEvent.mockRejectedValue(new Error('DB error'));
		mockRedisPush.mockRejectedValue(new Error('Redis DLQ write failed'));

		const handlePromise = service.handleWithRetry(event);
		await jest.runAllTimersAsync();

		await expect(handlePromise).resolves.toBeUndefined();
	});

	it('uses exponential backoff delays between retries', async () => {
		const delays: number[] = [];
		jest.spyOn(globalThis, 'setTimeout').mockImplementation((fn: any, ms?: number) => {
			delays.push(ms ?? 0);
			fn();
			return {} as any;
		});

		accountsService.createFromEvent.mockRejectedValue(new Error('error'));
		mockRedisPush.mockResolvedValue(1);

		await service.handleWithRetry(event);

		// First attempt has no delay; retries 2 and 3 should use 1000ms and 2000ms
		expect(delays).toEqual([1000, 2000]);
	});
});
