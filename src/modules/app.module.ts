import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpThrottlerGuard } from './http-throttler.guard';
import { typeOrmModuleAsyncOptions } from '../typeorm.config';
import { CacheModule } from './cache';
import { HealthModule } from './health/health.module';
import { AccountsModule } from './accounts/accounts.module';
import { ProfileModule } from './profile/profile.module';
import { PrivacyModule } from './privacy/privacy.module';
import { ContactsModule } from './contacts/contacts.module';
import { BlockedUsersModule } from './blocked-users/blocked-users.module';
import { GroupsModule } from './groups/groups.module';
import { UserSearchModule } from './search/user-search.module';
import { RolesModule } from './roles/roles.module';
import { SanctionsModule } from './sanctions/sanctions.module';
import { JwtAuthModule } from './jwt-auth/jwt-auth.module';
import { JwtAuthGuard } from './jwt-auth/jwt-auth.guard';

const GLOBAL_THROTTLE_TTL_MS = 60_000;
const GLOBAL_THROTTLE_LIMIT = 60;

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env.development', '.env.local', '.env'],
		}),
		TypeOrmModule.forRootAsync(typeOrmModuleAsyncOptions),
		ThrottlerModule.forRoot([{ ttl: GLOBAL_THROTTLE_TTL_MS, limit: GLOBAL_THROTTLE_LIMIT }]),
		CacheModule,
		JwtAuthModule,
		HealthModule,
		AccountsModule,
		ProfileModule,
		PrivacyModule,
		ContactsModule,
		BlockedUsersModule,
		GroupsModule,
		UserSearchModule,
		RolesModule,
		SanctionsModule,
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: HttpThrottlerGuard,
		},
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
	],
})
export class AppModule {}
