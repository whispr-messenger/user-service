import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message, User, BlockedUser, Contact } from '../entities';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Message, User, BlockedUser, Contact])],
  providers: [MessagesService],
  controllers: [MessagesController],
})
export class MessagesModule {}