import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { RolesModule } from '../roles/roles.module';
import { AuditModule } from '../audit/audit.module';
import { UserSanction } from './entities/user-sanction.entity';
import { SanctionsRepository } from './repositories/sanctions.repository';
import { SanctionsService } from './services/sanctions.service';
import { SanctionExpiryService } from './services/sanction-expiry.service';
import { SanctionsController } from './controllers/sanctions.controller';

// WHISPR-1053: AuditModule pulled in so admin write operations can log
// themselves into the consolidated audit trail.
@Module({
	imports: [CommonModule, RolesModule, AuditModule, TypeOrmModule.forFeature([UserSanction])],
	controllers: [SanctionsController],
	providers: [SanctionsService, SanctionsRepository, SanctionExpiryService],
	exports: [SanctionsService],
})
export class SanctionsModule {}
