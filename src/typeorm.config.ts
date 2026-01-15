import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

const DEFAULT_POSTGRES_PORT = 5432;

interface DatabaseConfig {
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
}

/**
 * Parses a database connection URL into config components
 */
function parseDatabaseUrl(url: string): DatabaseConfig {
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
		database: configService.get('DB_NAME', 'auth_service'),
	};
}

function getDataSourceOptions(configService: ConfigService): DataSourceOptions {
	// https://typeorm.io/docs/data-source/data-source-options/
	return {
		// RDBMS type. You must specify what database engine you use
		type: 'postgres',
		// Entities, or Entity Schemas, to be loaded and used for this data source.
		entities: [__dirname + '/**/*.entity{.ts,.js}'],
		// Indicates if logging is enabled or not. If set to true then query and error logging will be enabled.
		logging: configService.get('DB_LOGGING', 'false') === 'true',
		// Migrations to be loaded and used for this data source
		migrations: [__dirname + '/migrations/*{.ts,.js}'],
		// Indicates if migrations should be auto-run on every application launch.
		migrationsRun: configService.get('DB_MIGRATIONS_RUN', 'false') === 'true',
		// Indicates if database schema should be auto created on every application launch.
		// Be careful with this option and don't use this in production - otherwise you can lose production data.
		synchronize: configService.get('DB_SYNCHRONIZE', 'false') === 'true',
	};
}

/**
 * Factory function to create TypeORM configuration based on environment
 */
async function typeOrmModuleOptionsFactory(
	configService: ConfigService
): Promise<TypeOrmModuleOptions> {
	const databaseUrl = configService.get('DB_URL');
	const databaseConfig = databaseUrl ? parseDatabaseUrl(databaseUrl) : getEnvDatabaseConfig(configService);

	const dataSourceOptions: DataSourceOptions = getDataSourceOptions(configService);

	return {
		...databaseConfig,
		...dataSourceOptions,
	} as TypeOrmModuleOptions;
}

// Database (Postgres)
export const typeOrmModuleAsyncOptions: TypeOrmModuleAsyncOptions = {
	imports: [ConfigModule],
	useFactory: typeOrmModuleOptionsFactory,
	inject: [ConfigService],
};