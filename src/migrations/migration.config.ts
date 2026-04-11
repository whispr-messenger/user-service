import { DataSource } from 'typeorm';
import { User } from '../modules/common/entities/user.entity';
import { PrivacySettings } from '../modules/privacy/entities/privacy-settings.entity';
import { Contact } from '../modules/contacts/entities/contact.entity';
import { Group } from '../modules/groups/entities/group.entity';
import { BlockedUser } from '../modules/blocked-users/entities/blocked-user.entity';

const DEFAULT_POSTGRES_PORT = 5432;

function parseDatabaseUrl(url: string) {
	const parsed = new URL(url);
	return {
		host: parsed.hostname,
		port: parseInt(parsed.port, 10) || DEFAULT_POSTGRES_PORT,
		username: parsed.username,
		password: parsed.password,
		database: parsed.pathname.slice(1),
	};
}

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
	entities: [User, PrivacySettings, Contact, Group, BlockedUser],
	migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
});
