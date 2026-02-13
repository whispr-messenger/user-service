import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, PrivacySettings, UserSearchIndex, Contact, BlockedUser } from '../entities';
import { PrivacyModule } from '../privacy/privacy.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([User, PrivacySettings, UserSearchIndex, Contact, BlockedUser]),
		PrivacyModule,
	],
	controllers: [UsersController],
	providers: [UsersService],
	exports: [UsersService],
})
export class UsersModule {}
