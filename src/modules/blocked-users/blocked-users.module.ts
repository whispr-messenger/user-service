import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { BlockedUser } from './entities/blocked-user.entity';
import { BlockedUsersRepository } from './repositories/blocked-users.repository';
import { BlockedUsersService } from './services/blocked-users.service';
import { BlockedUsersController } from './controllers/blocked-users.controller';

@Module({
	imports: [CommonModule, TypeOrmModule.forFeature([BlockedUser])],
	controllers: [BlockedUsersController],
	providers: [BlockedUsersService, BlockedUsersRepository],
	exports: [BlockedUsersService, BlockedUsersRepository],
})
export class BlockedUsersModule {}
