import { createSwaggerDocumentation } from './swagger';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

jest.mock('@nestjs/swagger', () => {
	const original = jest.requireActual('@nestjs/swagger');
	return {
		...original,
		SwaggerModule: {
			createDocument: jest.fn().mockReturnValue({}),
			setup: jest.fn(),
		},
	};
});

function makeApp(): NestExpressApplication {
	return {} as NestExpressApplication;
}

function makeConfigService(env: Record<string, any> = {}): ConfigService {
	return {
		get: jest.fn(<T>(key: string, defaultValue?: T): T => {
			return (env[key] !== undefined ? env[key] : defaultValue) as T;
		}),
	} as unknown as ConfigService;
}

describe('createSwaggerDocumentation', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should not call SwaggerModule.setup when SWAGGER_ENABLED is false', () => {
		const configService = makeConfigService({ SWAGGER_ENABLED: false });

		createSwaggerDocumentation(makeApp(), 3000, configService);

		expect(SwaggerModule.setup).not.toHaveBeenCalled();
	});

	it('should call SwaggerModule.setup when SWAGGER_ENABLED is true', () => {
		const configService = makeConfigService({ SWAGGER_ENABLED: true });

		createSwaggerDocumentation(makeApp(), 3000, configService);

		expect(SwaggerModule.setup).toHaveBeenCalledTimes(1);
		expect(SwaggerModule.setup).toHaveBeenCalledWith(
			'swagger',
			expect.anything(),
			expect.any(Function),
			expect.anything()
		);
	});

	it('should default to enabled when SWAGGER_ENABLED is not set', () => {
		const configService = makeConfigService({});

		createSwaggerDocumentation(makeApp(), 3000, configService);

		expect(SwaggerModule.setup).toHaveBeenCalledTimes(1);
	});
});
