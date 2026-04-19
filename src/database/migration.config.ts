import { DataSource } from 'typeorm';
import { parseDatabaseUrl } from '../typeorm.config';

const DEFAULT_POSTGRES_PORT = 5432;

const databaseUrl = process.env.DB_URL;
const dbConfig = databaseUrl
	? parseDatabaseUrl(databaseUrl)
	: {
			host: process.env.DB_HOST || 'localhost',
			port: parseInt(process.env.DB_PORT, 10) || DEFAULT_POSTGRES_PORT,
			username: process.env.DB_USERNAME || 'postgres',
			password: process.env.DB_PASSWORD || 'password',
			database: process.env.DB_NAME || 'user_service',
		};

export default new DataSource({
	type: 'postgres',
	...dbConfig,
	entities: [__dirname + '/../**/*.entity{.ts,.js}'],
	migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
