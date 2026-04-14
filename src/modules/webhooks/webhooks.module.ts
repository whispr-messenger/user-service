import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesModule } from '../roles/roles.module';
import { Webhook } from './entities/webhook.entity';
import { WebhooksRepository } from './repositories/webhooks.repository';
import { WebhooksService } from './services/webhooks.service';
import { WebhooksController } from './controllers/webhooks.controller';

@Module({
	imports: [RolesModule, TypeOrmModule.forFeature([Webhook])],
	controllers: [WebhooksController],
	providers: [WebhooksService, WebhooksRepository],
	exports: [WebhooksService],
})
export class WebhooksModule {}
