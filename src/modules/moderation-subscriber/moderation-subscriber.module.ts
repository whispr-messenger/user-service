import { Module } from '@nestjs/common';
import { SanctionsModule } from '../sanctions/sanctions.module';
import { AuditModule } from '../audit/audit.module';
import { ModerationSubscriberService } from './moderation-subscriber.service';

@Module({
	imports: [SanctionsModule, AuditModule],
	providers: [ModerationSubscriberService],
})
export class ModerationSubscriberModule {}
