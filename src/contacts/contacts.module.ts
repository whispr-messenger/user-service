import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { Contact, User, BlockedUser } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, User, BlockedUser])],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
