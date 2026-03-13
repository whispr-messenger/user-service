import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { Contact } from './entities/contact.entity';
import { ContactsRepository } from './repositories/contacts.repository';
import { ContactsService } from './services/contacts.service';
import { ContactsController } from './controllers/contacts.controller';

@Module({
	imports: [CommonModule, TypeOrmModule.forFeature([Contact])],
	controllers: [ContactsController],
	providers: [ContactsService, ContactsRepository],
	exports: [ContactsService, ContactsRepository],
})
export class ContactsModule {}
