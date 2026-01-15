/* eslint-disable @typescript-eslint/no-require-imports */
import * as http from 'http';
import { EventEmitter } from 'events';

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation();

describe('health-check', () => {
	let mockRequest: EventEmitter & {
		end: jest.Mock;
		destroy: jest.Mock;
	};
	let mockResponse: EventEmitter & http.IncomingMessage;
	let httpRequestSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.resetModules();

		// Create mock request
		mockRequest = Object.assign(new EventEmitter(), {
			end: jest.fn(),
			destroy: jest.fn(),
		});

		// Create mock response
		mockResponse = Object.assign(new EventEmitter(), {
			statusCode: 200,
		} as http.IncomingMessage);
	});

	afterEach(() => {
		mockConsoleLog.mockClear();
		mockConsoleError.mockClear();
		if (httpRequestSpy) {
			httpRequestSpy.mockRestore();
		}
	});

	afterAll(() => {
		mockConsoleLog.mockRestore();
		mockConsoleError.mockRestore();
		mockExit.mockRestore();
	});

	const mockHttpRequest = (response?: EventEmitter & http.IncomingMessage) => {
		httpRequestSpy = jest.spyOn(http, 'request').mockImplementation((options: any, callback?: any) => {
			if (callback && response) {
				// Call callback synchronously to avoid async issues in tests
				callback(response);
			}
			return mockRequest as any;
		});
	};

	const loadHealthCheck = () => {
		try {
			require('./health-check');
		} catch {
			// Ignore any errors from mocked process.exit
		}
	};

	it('should exit with 0 when health check returns 200', async () => {
		mockHttpRequest(mockResponse);

		loadHealthCheck();

		// Simulate response data and end
		await new Promise<void>((resolve) => {
			process.nextTick(() => {
				mockResponse.emit('data', JSON.stringify({ status: 'ok' }));
				mockResponse.emit('end');
				// Wait for all events to be processed
				process.nextTick(resolve);
			});
		});

		expect(mockExit).toHaveBeenCalledWith(0);
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Health check starting...'));
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Health check PASSED'));
		expect(mockRequest.end).toHaveBeenCalled();
	});

	it('should exit with 1 when health check returns non-200 status', async () => {
		mockResponse.statusCode = 500;
		mockHttpRequest(mockResponse);

		loadHealthCheck();

		// Simulate response data and end
		await new Promise<void>((resolve) => {
			process.nextTick(() => {
				mockResponse.emit('data', JSON.stringify({ status: 'unhealthy' }));
				mockResponse.emit('end');
				process.nextTick(resolve);
			});
		});

		expect(mockExit).toHaveBeenCalledWith(1);
		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('✗ Health check FAILED'));
		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid status code 500'));
	});

	it('should exit with 1 when request encounters an error', async () => {
		mockHttpRequest();

		loadHealthCheck();

		// Simulate request error
		await new Promise<void>((resolve) => {
			const testError = new Error('Connection refused');
			process.nextTick(() => {
				mockRequest.emit('error', testError);
				process.nextTick(resolve);
			});
		});

		expect(mockExit).toHaveBeenCalledWith(1);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('✗ Health check FAILED: Request error')
		);
		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Connection refused'));
	});

	it('should exit with 1 when request times out', async () => {
		mockHttpRequest();

		loadHealthCheck();

		// Simulate timeout
		await new Promise<void>((resolve) => {
			process.nextTick(() => {
				mockRequest.emit('timeout');
				process.nextTick(resolve);
			});
		});

		expect(mockExit).toHaveBeenCalledWith(1);
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining('✗ Health check FAILED: Request timeout after 3000ms')
		);
		expect(mockRequest.destroy).toHaveBeenCalled();
	});

	it('should log correct request configuration', () => {
		mockHttpRequest(mockResponse);

		loadHealthCheck();

		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining('Target: GET http://localhost:3001/health/ready')
		);
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Timeout: 3000ms'));
	});

	it('should handle chunked response data correctly', async () => {
		mockHttpRequest(mockResponse);

		loadHealthCheck();

		// Simulate chunked response
		await new Promise<void>((resolve) => {
			process.nextTick(() => {
				mockResponse.emit('data', '{"sta');
				mockResponse.emit('data', 'tus":"');
				mockResponse.emit('data', 'ok"}');
				mockResponse.emit('end');
				process.nextTick(resolve);
			});
		});

		expect(mockExit).toHaveBeenCalledWith(0);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining('Response body: {"status":"ok"}')
		);
	});

	it('should log response status code when received', async () => {
		mockResponse.statusCode = 503;
		mockHttpRequest(mockResponse);

		loadHealthCheck();

		await new Promise<void>((resolve) => {
			process.nextTick(() => {
				mockResponse.emit('data', 'Service Unavailable');
				mockResponse.emit('end');
				process.nextTick(resolve);
			});
		});

		expect(mockExit).toHaveBeenCalledWith(1);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining('Response received with status code: 503')
		);
	});

	it('should include timestamp in all log messages', () => {
		mockHttpRequest(mockResponse);

		loadHealthCheck();

		const calls = mockConsoleLog.mock.calls;
		calls.forEach((call) => {
			// Check that each log message contains a timestamp in ISO format
			expect(call[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		});
	});
});
