import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appeal } from '../appeals/entities/appeal.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AppealsRepository } from '../appeals/repositories/appeals.repository';
import { AuditRepository } from '../audit/repositories/audit.repository';
import { GdprRetentionService } from './gdpr-retention.service';

// WHISPR-1057: dedicated module so the cron lifecycle stays isolated from
// the controllers that handle the live appeals / audit traffic. Registers
// its own copies of the repositories via TypeOrmModule.forFeature — the
// owning modules don't export them today, so pulling them via DI here keeps
// the public API of those modules unchanged.
@Module({
	imports: [TypeOrmModule.forFeature([Appeal, AuditLog])],
	providers: [AppealsRepository, AuditRepository, GdprRetentionService],
	exports: [GdprRetentionService],
})
export class RetentionModule {}
