import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

const DEFAULT_POSTGRES_PORT = 5432;

export interface DatabaseConfig {
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
}

/**
 * Parses a database connection URL into config components
 */
export function parseDatabaseUrl(url: string): DatabaseConfig {
	const parsed = new URL(url);
	return {
		host: parsed.hostname,
		port: parseInt(parsed.port, 10) || DEFAULT_POSTGRES_PORT,
		username: parsed.username,
		password: parsed.password,
		database: parsed.pathname.slice(1),
	};
}

/**
 * Retrieves database configuration from individual environment variables
 */
function getEnvDatabaseConfig(configService: ConfigService): DatabaseConfig {
	return {
		host: configService.get('DB_HOST', 'localhost'),
		port: configService.get('DB_PORT', DEFAULT_POSTGRES_PORT),
		username: configService.get('DB_USERNAME', 'postgres'),
		password: configService.get('DB_PASSWORD', 'password'),
		database: configService.get('DB_NAME', 'user_service'),
	};
}

function getDataSourceOptions(configService: ConfigService): DataSourceOptions {
	return {
		type: 'postgres',
		logging: configService.get('DB_LOGGING', 'false') === 'true',
		migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
		migrationsRun: configService.get('DB_MIGRATIONS_RUN', 'false') === 'true',
		migrationsTransactionMode: 'each',
		synchronize: configService.get('DB_SYNCHRONIZE', 'false') === 'true',
	};
}

/**
 * Factory function to create TypeORM configuration based on environment
 */
async function typeOrmModuleOptionsFactory(configService: ConfigService): Promise<TypeOrmModuleOptions> {
	const databaseUrl = configService.get('DB_URL');
	const databaseConfig = databaseUrl ? parseDatabaseUrl(databaseUrl) : getEnvDatabaseConfig(configService);
	const dataSourceOptions: DataSourceOptions = getDataSourceOptions(configService);

	return {
		...databaseConfig,
		...dataSourceOptions,
		autoLoadEntities: true,
	} as TypeOrmModuleOptions;
}

// Database (Postgres)
export const typeOrmModuleAsyncOptions: TypeOrmModuleAsyncOptions = {
	imports: [ConfigModule],
	useFactory: typeOrmModuleOptionsFactory,
	inject: [ConfigService],
};
