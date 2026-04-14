import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { RolesModule } from '../roles/roles.module';
import { AuditLog } from './entities/audit-log.entity';
import { AuditRepository } from './repositories/audit.repository';
import { AuditService } from './services/audit.service';
import { AuditController } from './controllers/audit.controller';

@Module({
	imports: [CommonModule, RolesModule, TypeOrmModule.forFeature([AuditLog])],
	controllers: [AuditController],
	providers: [AuditService, AuditRepository],
	exports: [AuditService],
})
export class AuditModule {}
