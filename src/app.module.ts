import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmModuleAsyncOptions } from './typeorm.config';
import { CacheModule } from '@nestjs/cache-manager';
import { cacheModuleAsyncOptions } from './cache.config';
import { HealthModule } from './health/health.module';

// import { UsersModule } from './users/users.module';
// import { PrivacyModule } from './privacy/privacy.module';
// import { ContactsModule } from './contacts/contacts.module';
// import { BlockedUsersModule } from './blocked-users/blocked-users.module';
// import { UserSearchModule } from './search/user-search.module';
// import { GroupsModule } from './groups/groups.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env.development', '.env.local', '.env'],
		}),
		TypeOrmModule.forRootAsync(typeOrmModuleAsyncOptions),
		CacheModule.registerAsync(cacheModuleAsyncOptions),
		HealthModule,
		// UsersModule,
		// PrivacyModule,
		// ContactsModule,
		// BlockedUsersModule,
		// UserSearchModule,
		// GroupsModule,
	],
})
export class AppModule { }
