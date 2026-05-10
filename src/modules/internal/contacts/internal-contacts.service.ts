import { Injectable } from '@nestjs/common';
import { ContactsService } from '../../contacts/services/contacts.service';
import { BlockedUsersService } from '../../blocked-users/services/blocked-users.service';
import { CheckContactResponseDto } from './dto/check-contact-response.dto';

@Injectable()
export class InternalContactsService {
	constructor(
		private readonly contactsService: ContactsService,
		private readonly blockedUsersService: BlockedUsersService
	) {}

	async checkContactRelation(ownerId: string, contactId: string): Promise<CheckContactResponseDto> {
		if (ownerId === contactId) {
			return { isContact: false, isBlocked: false };
		}

		const [isContact, isBlocked] = await Promise.all([
			this.contactsService.isContact(ownerId, contactId),
			this.blockedUsersService.isBlockedEitherWay(ownerId, contactId),
		]);

		return { isContact, isBlocked };
	}
}
