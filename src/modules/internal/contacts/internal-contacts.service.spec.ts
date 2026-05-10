import { Test, TestingModule } from '@nestjs/testing';
import { InternalContactsService } from './internal-contacts.service';
import { ContactsService } from '../../contacts/services/contacts.service';
import { BlockedUsersService } from '../../blocked-users/services/blocked-users.service';

describe('InternalContactsService', () => {
	let service: InternalContactsService;
	let contactsService: jest.Mocked<ContactsService>;
	let blockedUsersService: jest.Mocked<BlockedUsersService>;

	const OWNER_ID = 'a0000000-0000-4000-a000-000000000001';
	const CONTACT_ID = 'b0000000-0000-4000-b000-000000000002';

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				InternalContactsService,
				{
					provide: ContactsService,
					useValue: { isContact: jest.fn() },
				},
				{
					provide: BlockedUsersService,
					useValue: { isBlockedEitherWay: jest.fn() },
				},
			],
		}).compile();

		service = module.get(InternalContactsService);
		contactsService = module.get(ContactsService);
		blockedUsersService = module.get(BlockedUsersService);
	});

	describe('checkContactRelation', () => {
		it('returns isContact:true and isBlocked:false when the relation exists and no block', async () => {
			contactsService.isContact.mockResolvedValue(true);
			blockedUsersService.isBlockedEitherWay.mockResolvedValue(false);

			const result = await service.checkContactRelation(OWNER_ID, CONTACT_ID);

			expect(result).toEqual({ isContact: true, isBlocked: false });
			expect(contactsService.isContact).toHaveBeenCalledWith(OWNER_ID, CONTACT_ID);
			expect(blockedUsersService.isBlockedEitherWay).toHaveBeenCalledWith(OWNER_ID, CONTACT_ID);
		});

		it('returns isContact:false when no contact row exists (still 200)', async () => {
			contactsService.isContact.mockResolvedValue(false);
			blockedUsersService.isBlockedEitherWay.mockResolvedValue(false);

			const result = await service.checkContactRelation(OWNER_ID, CONTACT_ID);

			expect(result).toEqual({ isContact: false, isBlocked: false });
		});

		it('reports isBlocked:true when a block exists in either direction', async () => {
			contactsService.isContact.mockResolvedValue(true);
			blockedUsersService.isBlockedEitherWay.mockResolvedValue(true);

			const result = await service.checkContactRelation(OWNER_ID, CONTACT_ID);

			expect(result).toEqual({ isContact: true, isBlocked: true });
		});

		it('short-circuits when ownerId === contactId without touching repositories', async () => {
			const result = await service.checkContactRelation(OWNER_ID, OWNER_ID);

			expect(result).toEqual({ isContact: false, isBlocked: false });
			expect(contactsService.isContact).not.toHaveBeenCalled();
			expect(blockedUsersService.isBlockedEitherWay).not.toHaveBeenCalled();
		});
	});
});
