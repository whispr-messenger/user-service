import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

const mockUse = jest.fn();
const mockSetGlobalPrefix = jest.fn();
const mockEnableVersioning = jest.fn();
const mockConnectMicroservice = jest.fn();
const mockUseGlobalPipes = jest.fn();
const mockUseGlobalInterceptors = jest.fn();
const mockEnableCors = jest.fn();
const mockEnableShutdownHooks = jest.fn();
const mockStartAllMicroservices = jest.fn().mockResolvedValue(undefined);
const mockListen = jest.fn().mockResolvedValue(undefined);

const configValues: Record<string, any> = {};

const mockConfigService = {
	get: jest.fn((key: string, defaultValue?: any) => {
		return key in configValues ? configValues[key] : defaultValue;
	}),
};

const mockApp = {
	use: mockUse,
	get: jest.fn().mockReturnValue(mockConfigService),
	setGlobalPrefix: mockSetGlobalPrefix,
	enableVersioning: mockEnableVersioning,
	connectMicroservice: mockConnectMicroservice,
	useGlobalPipes: mockUseGlobalPipes,
	useGlobalInterceptors: mockUseGlobalInterceptors,
	enableCors: mockEnableCors,
	enableShutdownHooks: mockEnableShutdownHooks,
	startAllMicroservices: mockStartAllMicroservices,
	listen: mockListen,
};

jest.mock('@nestjs/core', () => ({
	NestFactory: { create: jest.fn() },
}));

jest.mock('./swagger', () => ({
	createSwaggerDocumentation: jest.fn(),
}));

jest.mock('./interceptors', () => ({
	LoggingInterceptor: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('./modules/app.module', () => ({
	AppModule: jest.fn(),
}));

const mockHelmet = jest.fn(() => 'helmet-middleware');
jest.mock('helmet', () => ({
	__esModule: true,
	default: mockHelmet,
}));

const mockCompression = jest.fn(() => 'compression-middleware');
jest.mock('compression', () => ({
	__esModule: true,
	default: mockCompression,
}));

import { bootstrap } from './main';

describe('bootstrap', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(NestFactory.create as jest.Mock).mockResolvedValue(mockApp);
		mockApp.get.mockReturnValue(mockConfigService);

		Object.keys(configValues).forEach((key) => delete configValues[key]);
		configValues.SWAGGER_ENABLED = 'true';
		configValues.ENABLE_CORS = 'false';
	});

	it('should apply helmet middleware', async () => {
		await bootstrap();

		expect(mockHelmet).toHaveBeenCalled();
		expect(mockUse).toHaveBeenCalledWith('helmet-middleware');
	});

	it('should apply compression middleware', async () => {
		await bootstrap();

		expect(mockCompression).toHaveBeenCalled();
		expect(mockUse).toHaveBeenCalledWith('compression-middleware');
	});

	it('should configure versioning with URI type', async () => {
		await bootstrap();

		expect(mockEnableVersioning).toHaveBeenCalledWith({
			type: VersioningType.URI,
			defaultVersion: '1',
			prefix: 'v',
		});
	});

	it('should set global prefix to "user"', async () => {
		await bootstrap();

		expect(mockSetGlobalPrefix).toHaveBeenCalledWith('user');
	});

	it('should listen on the default port', async () => {
		await bootstrap();

		expect(mockListen).toHaveBeenCalledWith(3002);
	});

	it('should enable shutdown hooks', async () => {
		await bootstrap();

		expect(mockEnableShutdownHooks).toHaveBeenCalled();
	});

	it('should start all microservices before listening', async () => {
		await bootstrap();

		expect(mockStartAllMicroservices).toHaveBeenCalled();
	});

	it('should enable CORS with allowed origins when ENABLE_CORS is true', async () => {
		configValues.ENABLE_CORS = 'true';
		configValues.CORS_ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:4200';

		await bootstrap();

		expect(mockEnableCors).toHaveBeenCalledWith({
			origin: ['http://localhost:3000', 'http://localhost:4200'],
			credentials: true,
		});
	});

	it('should not enable CORS when ENABLE_CORS is not true', async () => {
		await bootstrap();

		expect(mockEnableCors).not.toHaveBeenCalled();
	});

	it('should configure helmet with relaxed CSP when Swagger is enabled', async () => {
		configValues.SWAGGER_ENABLED = 'true';

		await bootstrap();

		expect(mockHelmet).toHaveBeenCalledWith(
			expect.objectContaining({
				contentSecurityPolicy: expect.objectContaining({
					directives: expect.objectContaining({
						defaultSrc: ["'self'"],
						scriptSrc: ["'self'", "'unsafe-inline'"],
					}),
				}),
				crossOriginEmbedderPolicy: false,
			})
		);
	});

	it('should configure helmet without relaxed CSP when Swagger is disabled', async () => {
		configValues.SWAGGER_ENABLED = 'false';

		await bootstrap();

		expect(mockHelmet).toHaveBeenCalledWith(
			expect.objectContaining({
				contentSecurityPolicy: undefined,
				crossOriginEmbedderPolicy: undefined,
			})
		);
	});
});
