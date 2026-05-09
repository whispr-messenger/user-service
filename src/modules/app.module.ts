import { Module, OnModuleDestroy } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpThrottlerGuard } from './http-throttler.guard';
import { typeOrmModuleAsyncOptions } from '../typeorm.config';
import { buildRedisOptions } from '../config/redis.config';
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
import { AppealsModule } from './appeals/appeals.module';
import { AuditModule } from './audit/audit.module';
import { RetentionModule } from './retention/retention.module';
import { ModerationSubscriberModule } from './moderation-subscriber/moderation-subscriber.module';
import { ReputationModule } from './reputation/reputation.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { BackupsModule } from './backups/backups.module';
import { InternalModule } from './internal/internal.module';
import { JwtAuthModule } from './jwt-auth/jwt-auth.module';
import { JwtAuthGuard } from './jwt-auth/jwt-auth.guard';
import { NoCacheInterceptor } from '../interceptors/no-cache.interceptor';

// Triple-tier global throttler aligned with media-service (WHISPR-1327):
// short = burst protection, medium = sustained burst, long = global ceiling.
// La storage Redis garantit que les limites tiennent meme avec plusieurs replicas.
const SHORT_THROTTLER: ThrottlerOptions = { name: 'short', ttl: 1000, limit: 5 };
const MEDIUM_THROTTLER: ThrottlerOptions = { name: 'medium', ttl: 10_000, limit: 50 };
const LONG_THROTTLER: ThrottlerOptions = { name: 'long', ttl: 60_000, limit: 300 };

// On garde une reference locale au client Redis cree par la factory pour pouvoir
// le fermer dans OnModuleDestroy : sinon les tests jest hang sur la connexion
// (cf pre-push hook code 137) et k8s ne peut pas terminer le pod proprement.
let throttlerRedisClient: Redis | null = null;

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env.development', '.env.local', '.env'],
		}),
		TypeOrmModule.forRootAsync(typeOrmModuleAsyncOptions),
		ThrottlerModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				throttlerRedisClient = new Redis(buildRedisOptions(configService));
				return {
					throttlers: [SHORT_THROTTLER, MEDIUM_THROTTLER, LONG_THROTTLER],
					storage: new ThrottlerStorageRedisService(throttlerRedisClient),
				};
			},
		}),
		ScheduleModule.forRoot(),
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
		AppealsModule,
		AuditModule,
		RetentionModule,
		ModerationSubscriberModule,
		ReputationModule,
		WebhooksModule,
		BackupsModule,
		InternalModule,
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
		{
			provide: APP_INTERCEPTOR,
			useClass: NoCacheInterceptor,
		},
	],
})
export class AppModule implements OnModuleDestroy {
	async onModuleDestroy(): Promise<void> {
		if (!throttlerRedisClient) return;
		try {
			await throttlerRedisClient.quit();
		} catch {
			throttlerRedisClient.disconnect();
		} finally {
			throttlerRedisClient = null;
		}
	}
}
