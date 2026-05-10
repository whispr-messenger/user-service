import { JsonLogger } from './json-logger';

describe('JsonLogger', () => {
	let stdoutSpy: jest.SpyInstance;
	let stderrSpy: jest.SpyInstance;

	beforeEach(() => {
		stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
		stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	function readLastCall(spy: jest.SpyInstance): Record<string, unknown> | null {
		const calls = spy.mock.calls;
		if (calls.length === 0) return null;
		const payload = calls[calls.length - 1][0] as string;
		return JSON.parse(payload.trim());
	}

	it('emits a JSON line to stdout for log/debug/verbose', () => {
		const logger = new JsonLogger({ service: 'svc', level: 'verbose' });

		logger.log('hello', 'BootstrapCtx');
		const payload = readLastCall(stdoutSpy);

		expect(payload).toMatchObject({
			level: 'log',
			service: 'svc',
			context: 'BootstrapCtx',
			message: 'hello',
		});
		expect(payload?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(typeof payload?.pid).toBe('number');
		expect(typeof payload?.logger_id).toBe('string');
	});

	it('emits warn and error to stderr', () => {
		const logger = new JsonLogger({ service: 'svc' });

		logger.warn('heads up');
		logger.error('boom', 'trace-string', 'SomeCtx');

		const first = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
		const second = JSON.parse((stderrSpy.mock.calls[1][0] as string).trim());

		expect(first).toMatchObject({ level: 'warn', message: 'heads up' });
		expect(second).toMatchObject({
			level: 'error',
			message: 'boom',
			trace: 'trace-string',
			context: 'SomeCtx',
		});
	});

	it('serializes an object message as JSON string', () => {
		const logger = new JsonLogger({ service: 'svc' });

		logger.log({ event: 'http_request', method: 'GET', url: '/x' }, 'LoggingInterceptor');
		const payload = readLastCall(stdoutSpy);

		expect(payload?.context).toBe('LoggingInterceptor');
		expect(JSON.parse(payload?.message as string)).toEqual({
			event: 'http_request',
			method: 'GET',
			url: '/x',
		});
	});

	it('extracts the message from an Error instance', () => {
		const logger = new JsonLogger({ service: 'svc' });

		logger.error(new Error('boom'));
		const payload = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());

		expect(payload.message).toBe('boom');
	});

	it('suppresses entries below the configured level', () => {
		const logger = new JsonLogger({ service: 'svc', level: 'warn' });

		logger.debug('noise');
		logger.log('still below');
		logger.warn('surface');

		expect(stdoutSpy).not.toHaveBeenCalled();
		const calls = stderrSpy.mock.calls.map((c) => JSON.parse((c[0] as string).trim()));
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({ level: 'warn', message: 'surface' });
	});

	it('defaults context to the service name when not provided', () => {
		const logger = new JsonLogger({ service: 'svc' });

		logger.log('hi');

		expect(readLastCall(stdoutSpy)?.context).toBe('svc');
	});

	it('falls back to "log" when LOG_LEVEL is garbage', () => {
		const prev = process.env.LOG_LEVEL;
		process.env.LOG_LEVEL = 'bogus';
		try {
			const logger = new JsonLogger({ service: 'svc' });
			logger.debug('skipped'); // log threshold ⇒ debug is suppressed
			logger.log('kept');

			expect(stdoutSpy).toHaveBeenCalledTimes(1);
			expect(readLastCall(stdoutSpy)?.message).toBe('kept');
		} finally {
			if (prev === undefined) delete process.env.LOG_LEVEL;
			else process.env.LOG_LEVEL = prev;
		}
	});
});
