import { Logger } from '@nestjs/common';
import { withStreamLogging } from './stream-event.logging';

describe('withStreamLogging', () => {
	let logSpy: jest.SpyInstance;
	let errorSpy: jest.SpyInstance;

	beforeEach(() => {
		logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
		errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('success path', () => {
		it('logs Incoming + Processed and returns the handler value', async () => {
			const result = await withStreamLogging(
				{
					eventName: 'user.registered',
					stream: 'stream:user.registered',
					group: 'user-service',
					messageId: '1700000000000-0',
					correlationId: 'req-abc',
				},
				async () => 'ok'
			);

			expect(result).toBe('ok');
			expect(logSpy).toHaveBeenCalledWith(
				'Incoming user.registered stream=stream:user.registered group=user-service id=1700000000000-0 corr=req-abc'
			);
			expect(logSpy).toHaveBeenCalledWith(
				expect.stringMatching(/^Processed user\.registered id=1700000000000-0 \d+ms$/)
			);
			expect(errorSpy).not.toHaveBeenCalled();
		});

		it('uses dashes for missing messageId and correlationId', async () => {
			await withStreamLogging(
				{
					eventName: 'moderation.threshold_reached',
					channel: 'whispr:moderation:threshold_reached',
				},
				async () => undefined
			);

			expect(logSpy).toHaveBeenCalledWith(
				'Incoming moderation.threshold_reached channel=whispr:moderation:threshold_reached id=- corr=-'
			);
			expect(logSpy).toHaveBeenCalledWith(
				expect.stringMatching(/^Processed moderation\.threshold_reached id=- \d+ms$/)
			);
		});

		it('measures a non-negative duration in milliseconds', async () => {
			await withStreamLogging({ eventName: 'evt', messageId: '1' }, async () => {
				await new Promise((resolve) => globalThis.setTimeout(resolve, 5));
			});

			const processedCall = logSpy.mock.calls.find(([msg]) =>
				typeof msg === 'string' ? msg.startsWith('Processed') : false
			);
			expect(processedCall).toBeDefined();
			const match = (processedCall![0] as string).match(/(\d+)ms/);
			expect(match).not.toBeNull();
			expect(Number(match![1])).toBeGreaterThanOrEqual(0);
		});
	});

	describe('error path', () => {
		it('logs Incoming + Failed and re-throws the original error', async () => {
			const boom = new Error('database unavailable');

			await expect(
				withStreamLogging({ eventName: 'evt', messageId: '42' }, async () => {
					throw boom;
				})
			).rejects.toBe(boom);

			expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^Incoming evt /));
			expect(errorSpy).toHaveBeenCalledWith(
				expect.stringMatching(/^Failed evt id=42 \d+ms message="database unavailable"$/)
			);
		});

		it('serialises non-Error throwables in the failure message', async () => {
			await expect(
				withStreamLogging({ eventName: 'evt', messageId: '7' }, async () => {
					throw 'raw string';
				})
			).rejects.toBe('raw string');

			expect(errorSpy).toHaveBeenCalledWith(
				expect.stringMatching(/^Failed evt id=7 \d+ms message="raw string"$/)
			);
		});

		it('measures a non-negative duration on failure', async () => {
			await expect(
				withStreamLogging({ eventName: 'evt', messageId: '99' }, async () => {
					await new Promise((resolve) => globalThis.setTimeout(resolve, 5));
					throw new Error('late');
				})
			).rejects.toThrow('late');

			const failedCall = errorSpy.mock.calls.find(([msg]) =>
				typeof msg === 'string' ? msg.startsWith('Failed') : false
			);
			expect(failedCall).toBeDefined();
			const match = (failedCall![0] as string).match(/(\d+)ms/);
			expect(match).not.toBeNull();
			expect(Number(match![1])).toBeGreaterThanOrEqual(0);
		});
	});
});
