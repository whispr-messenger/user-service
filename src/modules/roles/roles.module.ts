import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { UserRole } from './entities/user-role.entity';
import { RolesRepository } from './repositories/roles.repository';
import { RolesService } from './services/roles.service';
import { RolesController } from './controllers/roles.controller';

@Module({
	imports: [CommonModule, TypeOrmModule.forFeature([UserRole])],
	controllers: [RolesController],
	providers: [RolesService, RolesRepository],
	exports: [RolesService],
})
export class RolesModule {}
