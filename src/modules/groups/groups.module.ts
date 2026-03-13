import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { GroupsRepository } from './repositories/groups.repository';
import { GroupMembersRepository } from './repositories/group-members.repository';
import { GroupsService } from './services/groups.service';
import { GroupsController } from './controllers/groups.controller';

@Module({
	imports: [CommonModule, TypeOrmModule.forFeature([Group, GroupMember])],
	controllers: [GroupsController],
	providers: [GroupsService, GroupsRepository, GroupMembersRepository],
	exports: [GroupsService, GroupsRepository, GroupMembersRepository],
})
export class GroupsModule {}
