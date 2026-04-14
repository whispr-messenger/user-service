import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { RolesModule } from '../roles/roles.module';
import { SanctionsModule } from '../sanctions/sanctions.module';
import { Appeal } from './entities/appeal.entity';
import { AppealsRepository } from './repositories/appeals.repository';
import { AppealsService } from './services/appeals.service';
import { AppealsController } from './controllers/appeals.controller';

@Module({
	imports: [CommonModule, RolesModule, SanctionsModule, TypeOrmModule.forFeature([Appeal])],
	controllers: [AppealsController],
	providers: [AppealsService, AppealsRepository],
	exports: [AppealsService],
})
export class AppealsModule {}
