import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmModuleAsyncOptions } from '../typeorm.config';
import { CacheModule } from './cache';
import { HealthModule } from './health/health.module';
import { AccountsModule } from './accounts/accounts.module';
import { ProfileModule } from './profile/profile.module';
import { PrivacyModule } from './privacy/privacy.module';
import { ContactsModule } from './contacts/contacts.module';
import { BlockedUsersModule } from './blocked-users/blocked-users.module';
import { JwtAuthModule } from './jwt-auth/jwt-auth.module';
import { JwtAuthGuard } from './jwt-auth/jwt-auth.guard';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env.development', '.env.local', '.env'],
		}),
		TypeOrmModule.forRootAsync(typeOrmModuleAsyncOptions),
		CacheModule,
		JwtAuthModule,
		HealthModule,
		AccountsModule,
		ProfileModule,
		PrivacyModule,
		ContactsModule,
		BlockedUsersModule,
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
	],
})
export class AppModule {}
