import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, PrivacySettings, UserSearchIndex } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, PrivacySettings, UserSearchIndex])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
