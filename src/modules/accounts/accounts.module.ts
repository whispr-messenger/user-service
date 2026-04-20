import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccountsController } from './controllers/accounts.controller';
import { AccountsService } from './services/accounts.service';
import { UserRegisteredStreamConsumer } from './services/user-registered-stream.consumer';
import { CommonModule } from '../common/common.module';

/**
 * AccountsModule - Core user identity and lifecycle management
 *
 * This module handles:
 * - User account creation from Redis Streams events (stream:user.registered)
 * - Activity tracking (last seen updates)
 * - Account status management (activation, deactivation)
 * - Account deletion
 *
 * The module consumes events from the auth module via Redis Streams consumer groups,
 * guaranteeing no message loss even if the service is temporarily unavailable.
 */
@Module({
	imports: [
		CommonModule,
		// Event bus configuration for publishing user events
		ClientsModule.registerAsync([
			{
				name: 'EVENTS_SERVICE',
				imports: [ConfigModule],
				useFactory: (configService: ConfigService) => ({
					transport: Transport.REDIS,
					options: {
						host: configService.get<string>('REDIS_HOST', 'localhost'),
						port: configService.get<number>('REDIS_PORT', 6379),
						username: configService.get<string>('REDIS_USERNAME'),
						password: configService.get<string>('REDIS_PASSWORD'),
					},
				}),
				inject: [ConfigService],
			},
		]),
	],
	controllers: [AccountsController],
	providers: [AccountsService, UserRegisteredStreamConsumer],
	exports: [AccountsService],
})
export class AccountsModule {}
