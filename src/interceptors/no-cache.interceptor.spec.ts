import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { NoCacheInterceptor } from './no-cache.interceptor';

describe('NoCacheInterceptor', () => {
	let interceptor: NoCacheInterceptor;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [NoCacheInterceptor],
		}).compile();

		interceptor = module.get<NoCacheInterceptor>(NoCacheInterceptor);
	});

	const buildContext = (response: { setHeader: jest.Mock }) =>
		({
			switchToHttp: () => ({
				getResponse: () => response,
			}),
		}) as unknown as ExecutionContext;

	it('should be defined', () => {
		expect(interceptor).toBeDefined();
	});

	it('sets Cache-Control: no-store and related anti-cache headers', async () => {
		const setHeader = jest.fn();
		const ctx = buildContext({ setHeader });
		const next: CallHandler = { handle: () => of('ok') };

		await lastValueFrom(interceptor.intercept(ctx, next));

		expect(setHeader).toHaveBeenCalledWith(
			'Cache-Control',
			'no-store, no-cache, must-revalidate, private'
		);
		expect(setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
		expect(setHeader).toHaveBeenCalledWith('Expires', '0');
	});

	it('passes through the next handler value', async () => {
		const setHeader = jest.fn();
		const ctx = buildContext({ setHeader });
		const next: CallHandler = { handle: () => of({ id: 42 }) };

		const value = await lastValueFrom(interceptor.intercept(ctx, next));

		expect(value).toEqual({ id: 42 });
	});
});
