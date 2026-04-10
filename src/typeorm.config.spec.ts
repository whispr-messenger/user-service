import { typeOrmModuleAsyncOptions } from './typeorm.config';
import { ConfigService } from '@nestjs/config';

function makeConfigService(env: Record<string, string> = {}): ConfigService {
	return {
		get: jest.fn((key: string, defaultValue?: any) => {
			return env[key] !== undefined ? env[key] : defaultValue;
		}),
	} as unknown as ConfigService;
}

describe('typeorm.config', () => {
	describe('typeOrmModuleAsyncOptions', () => {
		it('should export useFactory and inject ConfigService', () => {
			expect(typeOrmModuleAsyncOptions.inject).toContain(ConfigService);
			expect(typeof typeOrmModuleAsyncOptions.useFactory).toBe('function');
		});
	});

	describe('useFactory (typeOrmModuleOptionsFactory)', () => {
		const factory = typeOrmModuleAsyncOptions.useFactory as (cs: ConfigService) => Promise<any>;

		it('should parse DB_URL when present', async () => {
			const configService = makeConfigService({
				DB_URL: 'postgres://myuser:mypassword@myhost:5433/mydb',
			});

			const result = await factory(configService);

			expect(result.host).toBe('myhost');
			expect(result.port).toBe(5433);
			expect(result.username).toBe('myuser');
			expect(result.password).toBe('mypassword');
			expect(result.database).toBe('mydb');
		});

		it('should fall back to default port 5432 when DB_URL has no port', async () => {
			const configService = makeConfigService({
				DB_URL: 'postgres://user:pass@host/mydb',
			});

			const result = await factory(configService);

			expect(result.port).toBe(5432);
		});

		it('should use individual env variables when DB_URL is absent', async () => {
			const configService = makeConfigService({
				DB_HOST: 'envhost',
				DB_PORT: '5434',
				DB_USERNAME: 'envuser',
				DB_PASSWORD: 'envpassword',
				DB_NAME: 'envdb',
			});

			const result = await factory(configService);

			expect(result.host).toBe('envhost');
			expect(result.username).toBe('envuser');
			expect(result.database).toBe('envdb');
		});

		it('should use defaults when individual env vars are absent', async () => {
			const configService = makeConfigService({});

			const result = await factory(configService);

			expect(result.host).toBe('localhost');
			expect(result.port).toBe(5432);
			expect(result.username).toBe('postgres');
			expect(result.password).toBe('password');
			expect(result.database).toBe('user_service');
		});

		it('should set logging to true when DB_LOGGING is "true"', async () => {
			const configService = makeConfigService({ DB_LOGGING: 'true' });

			const result = await factory(configService);

			expect(result.logging).toBe(true);
		});

		it('should set logging to false when DB_LOGGING is "false"', async () => {
			const configService = makeConfigService({ DB_LOGGING: 'false' });

			const result = await factory(configService);

			expect(result.logging).toBe(false);
		});

		it('should set synchronize to true when DB_SYNCHRONIZE is "true"', async () => {
			const configService = makeConfigService({ DB_SYNCHRONIZE: 'true' });

			const result = await factory(configService);

			expect(result.synchronize).toBe(true);
		});

		it('should set migrationsRun to true when DB_MIGRATIONS_RUN is "true"', async () => {
			const configService = makeConfigService({ DB_MIGRATIONS_RUN: 'true' });

			const result = await factory(configService);

			expect(result.migrationsRun).toBe(true);
		});

		it('should include migrations array and autoLoadEntities in result', async () => {
			const configService = makeConfigService({});

			const result = await factory(configService);

			expect((result as any).autoLoadEntities).toBe(true);
			expect(result.migrations).toBeDefined();
			expect(result.type).toBe('postgres');
		});
	});
});
