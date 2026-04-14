import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesModule } from '../roles/roles.module';
import { UserReputation } from './entities/user-reputation.entity';
import { ReputationRepository } from './repositories/reputation.repository';
import { ReputationService } from './services/reputation.service';
import { ReputationController } from './controllers/reputation.controller';

@Module({
	imports: [RolesModule, TypeOrmModule.forFeature([UserReputation])],
	controllers: [ReputationController],
	providers: [ReputationService, ReputationRepository],
	exports: [ReputationService],
})
export class ReputationModule {}
