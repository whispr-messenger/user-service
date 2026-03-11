import { DatabaseConfig } from './database.config';
import { ConfigService } from '@nestjs/config';

function makeConfigService(env: Record<string, string> = {}): ConfigService {
	return {
		get: jest.fn(<T>(key: string, defaultValue?: T): T => {
			return (env[key] !== undefined ? env[key] : defaultValue) as T;
		}),
	} as unknown as ConfigService;
}

describe('DatabaseConfig', () => {
	describe('createTypeOrmOptions', () => {
		it('should return ssl: false when DB_SSL is "false"', () => {
			const configService = makeConfigService({ DB_SSL: 'false' });
			const config = new DatabaseConfig(configService);

			const options = config.createTypeOrmOptions() as any;

			expect(options.ssl).toBe(false);
		});

		it('should return ssl with rejectUnauthorized: false when DB_SSL is "true"', () => {
			const configService = makeConfigService({ DB_SSL: 'true' });
			const config = new DatabaseConfig(configService);

			const options = config.createTypeOrmOptions() as any;

			expect(options.ssl).toEqual({ rejectUnauthorized: false });
		});

		it('should use default values when env vars are absent', () => {
			const configService = makeConfigService({});
			const config = new DatabaseConfig(configService);

			const options = config.createTypeOrmOptions() as any;

			expect(options.type).toBe('postgres');
			expect(options.host).toBe('localhost');
			expect(options.port).toBe(5432);
			expect(options.username).toBe('postgres');
			expect(options.password).toBe('password');
			expect(options.database).toBe('user_service');
		});

		it('should set synchronize to true when DB_SYNCHRONIZE is "true"', () => {
			const configService = makeConfigService({ DB_SYNCHRONIZE: 'true' });
			const config = new DatabaseConfig(configService);

			const options = config.createTypeOrmOptions() as any;

			expect(options.synchronize).toBe(true);
		});

		it('should set logging to true when DB_LOGGING is "true"', () => {
			const configService = makeConfigService({ DB_LOGGING: 'true' });
			const config = new DatabaseConfig(configService);

			const options = config.createTypeOrmOptions() as any;

			expect(options.logging).toBe(true);
		});
	});
});
