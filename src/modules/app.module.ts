import { Inject, Module, OnModuleDestroy, Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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

// Triple-tier global throttler aligned with media-service (WHISPR-1327):
// short = burst protection, medium = sustained burst, long = global ceiling.
// La storage Redis garantit que les limites tiennent meme avec plusieurs replicas.
const SHORT_THROTTLER: ThrottlerOptions = { name: 'short', ttl: 1000, limit: 5 };
const MEDIUM_THROTTLER: ThrottlerOptions = { name: 'medium', ttl: 10_000, limit: 50 };
const LONG_THROTTLER: ThrottlerOptions = { name: 'long', ttl: 60_000, limit: 300 };

// Token Nest pour exposer le client Redis du throttler et le fermer
// proprement a l'arret de l'app (sinon jest hang sur la connexion ouverte).
const THROTTLER_REDIS_CLIENT = 'THROTTLER_REDIS_CLIENT';

const throttlerRedisProvider: Provider = {
	provide: THROTTLER_REDIS_CLIENT,
	inject: [ConfigService],
	useFactory: (configService: ConfigService) => new Redis(buildRedisOptions(configService)),
};

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env.development', '.env.local', '.env'],
		}),
		TypeOrmModule.forRootAsync(typeOrmModuleAsyncOptions),
		ThrottlerModule.forRootAsync({
			imports: [ConfigModule],
			inject: [THROTTLER_REDIS_CLIENT],
			useFactory: (client: Redis) => ({
				throttlers: [SHORT_THROTTLER, MEDIUM_THROTTLER, LONG_THROTTLER],
				storage: new ThrottlerStorageRedisService(client),
			}),
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
		throttlerRedisProvider,
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
export class AppModule implements OnModuleDestroy {
	constructor(@Inject(THROTTLER_REDIS_CLIENT) private readonly throttlerRedis: Redis) {}

	async onModuleDestroy(): Promise<void> {
		// Fermer la connexion Redis du throttler pour ne pas laisser le process hang
		// (jest --detectOpenHandles, pre-push hook, lifecycle k8s).
		try {
			await this.throttlerRedis.quit();
		} catch {
			this.throttlerRedis.disconnect();
		}
	}
}
