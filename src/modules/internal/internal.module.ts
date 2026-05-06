import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { BlockedUsersModule } from '../blocked-users/blocked-users.module';
import { InternalAuthGuard } from './internal-auth.guard';
import { InternalContactsController } from './contacts/internal-contacts.controller';
import { InternalContactsService } from './contacts/internal-contacts.service';

@Module({
	imports: [ContactsModule, BlockedUsersModule],
	controllers: [InternalContactsController],
	providers: [InternalAuthGuard, InternalContactsService],
})
export class InternalModule {}
