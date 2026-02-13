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
				get: jest.fn().mockReturnValue('TestAgent'),
			};

			const mockResponse = {
				statusCode: 200,
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

		it('should log incoming request and outgoing response on success', async () => {
			(next.handle as jest.Mock).mockReturnValue(of('data'));

			await lastValueFrom(interceptor.intercept(context, next));

			expect(loggerSpy).toHaveBeenCalledWith(
				expect.stringContaining('Incoming Request: GET /test - IP: 127.0.0.1 - User-Agent: TestAgent')
			);
			expect(loggerSpy).toHaveBeenCalledWith(
				expect.stringContaining('Outgoing Response: GET /test - Status: 200')
			);
		});

		it('should use empty string for User-Agent if not present', async () => {
			(context.switchToHttp().getRequest as jest.Mock).mockReturnValue({
				method: 'GET',
				url: '/test',
				ip: '127.0.0.1',
				get: jest.fn().mockReturnValue(undefined),
			});
			(next.handle as jest.Mock).mockReturnValue(of('data'));

			await lastValueFrom(interceptor.intercept(context, next));

			expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('User-Agent: '));
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
