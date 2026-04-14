import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { RolesModule } from '../roles/roles.module';
import { UserSanction } from './entities/user-sanction.entity';
import { SanctionsRepository } from './repositories/sanctions.repository';
import { SanctionsService } from './services/sanctions.service';
import { SanctionsController } from './controllers/sanctions.controller';

@Module({
	imports: [CommonModule, RolesModule, TypeOrmModule.forFeature([UserSanction])],
	controllers: [SanctionsController],
	providers: [SanctionsService, SanctionsRepository],
	exports: [SanctionsService],
})
export class SanctionsModule {}
