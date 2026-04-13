import { Test, TestingModule } from '@nestjs/testing';
import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';

describe('LoggingInterceptor', () => {
	let interceptor: LoggingInterceptor;
	let loggerSpy: jest.SpyInstance;
	let errorLoggerSpy: jest.SpyInstance;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [LoggingInterceptor],
		}).compile();

		interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
		loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
		errorLoggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(interceptor).toBeDefined();
	});

	describe('intercept', () => {
		let context: ExecutionContext;
		let next: CallHandler;

		beforeEach(() => {
			const mockRequest = {
				method: 'GET',
				url: '/test',
				ip: '127.0.0.1',
				get: jest.fn((header: string) => {
					if (header === 'User-Agent') return 'TestAgent';
					if (header === 'X-Request-Id') return 'test-request-id';
					return undefined;
				}),
			};

			const mockResponse = {
				statusCode: 200,
				setHeader: jest.fn(),
			};

			context = {
				switchToHttp: jest.fn().mockReturnValue({
					getRequest: jest.fn().mockReturnValue(mockRequest),
					getResponse: jest.fn().mockReturnValue(mockResponse),
				}),
			} as unknown as ExecutionContext;

			next = {
				handle: jest.fn(),
			};
		});

		it('should log incoming request and outgoing response with request-id', async () => {
			(next.handle as jest.Mock).mockReturnValue(of('data'));

			await lastValueFrom(interceptor.intercept(context, next));

			expect(loggerSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					'[test-request-id] Incoming Request: GET /test - IP: 127.0.0.1 - User-Agent: TestAgent'
				)
			);
			expect(loggerSpy).toHaveBeenCalledWith(
				expect.stringContaining('[test-request-id] Outgoing Response: GET /test - Status: 200')
			);
		});

		it('should set X-Request-Id response header', async () => {
			(next.handle as jest.Mock).mockReturnValue(of('data'));

			await lastValueFrom(interceptor.intercept(context, next));

			const mockResponse = context.switchToHttp().getResponse();
			expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'test-request-id');
		});

		it('should generate a request-id when X-Request-Id header is absent', async () => {
			(context.switchToHttp().getRequest as jest.Mock).mockReturnValue({
				method: 'GET',
				url: '/test',
				ip: '127.0.0.1',
				get: jest.fn().mockReturnValue(undefined),
			});
			(next.handle as jest.Mock).mockReturnValue(of('data'));

			await lastValueFrom(interceptor.intercept(context, next));

			expect(loggerSpy).toHaveBeenCalledWith(expect.stringMatching(/\[.+\] Incoming Request/));
			const mockResponse = context.switchToHttp().getResponse();
			expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
		});

		it('should reject invalid X-Request-Id and generate a new one', async () => {
			const malicious = 'invalid!@#$%header';
			(context.switchToHttp().getRequest as jest.Mock).mockReturnValue({
				method: 'GET',
				url: '/test',
				ip: '127.0.0.1',
				get: jest.fn((header: string) => {
					if (header === 'X-Request-Id') return malicious;
					return undefined;
				}),
			});
			(next.handle as jest.Mock).mockReturnValue(of('data'));

			await lastValueFrom(interceptor.intercept(context, next));

			const mockResponse = context.switchToHttp().getResponse();
			expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
			const setHeaderCall = (mockResponse.setHeader as jest.Mock).mock.calls[0];
			expect(setHeaderCall[1]).not.toBe(malicious);
		});

		it('should log error on failure', async () => {
			const error = { status: 404, message: 'Not Found' };
			(next.handle as jest.Mock).mockReturnValue(throwError(() => error));

			await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toEqual(error);

			expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Incoming Request: GET /test'));
			expect(errorLoggerSpy).toHaveBeenCalledWith(
				expect.stringContaining('Request Error: GET /test - Status: 404')
			);
		});

		it('should log error with default status 500 on failure without status', async () => {
			const error = { message: 'Internal Server Error' };
			(next.handle as jest.Mock).mockReturnValue(throwError(() => error));

			await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toEqual(error);

			expect(errorLoggerSpy).toHaveBeenCalledWith(expect.stringContaining('Status: 500'));
		});
	});
});
