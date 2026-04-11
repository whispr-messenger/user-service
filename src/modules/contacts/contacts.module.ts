import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { Contact } from './entities/contact.entity';
import { ContactRequest } from './entities/contact-request.entity';
import { ContactsRepository } from './repositories/contacts.repository';
import { ContactRequestsRepository } from './repositories/contact-requests.repository';
import { ContactsService } from './services/contacts.service';
import { ContactRequestsService } from './services/contact-requests.service';
import { ContactsController } from './controllers/contacts.controller';
import { ContactRequestsController } from './controllers/contact-requests.controller';

@Module({
	imports: [CommonModule, TypeOrmModule.forFeature([Contact, ContactRequest])],
	controllers: [ContactsController, ContactRequestsController],
	providers: [ContactsService, ContactsRepository, ContactRequestsService, ContactRequestsRepository],
	exports: [ContactsService, ContactRequestsService],
})
export class ContactsModule {}
