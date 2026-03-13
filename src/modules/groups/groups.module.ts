import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { Group } from './entities/group.entity';
import { GroupsRepository } from './repositories/groups.repository';
import { GroupsService } from './services/groups.service';
import { GroupsController } from './controllers/groups.controller';

@Module({
	imports: [CommonModule, TypeOrmModule.forFeature([Group])],
	controllers: [GroupsController],
	providers: [GroupsService, GroupsRepository],
	exports: [GroupsService],
})
export class GroupsModule {}
