import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmModuleAsyncOptions } from '../typeorm.config';
import { CacheModule } from './cache';
import { HealthModule } from './health/health.module';
import { AccountsModule } from './accounts/accounts.module';
import { ProfileModule } from './profile/profile.module';
import { PrivacyModule } from './privacy/privacy.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env.development', '.env.local', '.env'],
		}),
		TypeOrmModule.forRootAsync(typeOrmModuleAsyncOptions),
		CacheModule,
		HealthModule,
		AccountsModule,
		ProfileModule,
		PrivacyModule,
	],
})
export class AppModule {}
