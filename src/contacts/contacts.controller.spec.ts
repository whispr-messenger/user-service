import { Test, TestingModule } from '@nestjs/testing';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { AddContactDto, UpdateContactDto, CreateContactRequestDto, RespondToContactRequestDto } from '../dto';
import { Contact, ContactRequest, ContactRequestStatus } from '../entities';

describe('ContactsController', () => {
	let controller: ContactsController;

	const mockContact: Contact = {
		id: 'contact-id',
		userId: 'user-id',
		contactId: 'contact-user-id',
		isFavorite: false,
		nickname: '',
		addedAt: new Date(),
		updatedAt: new Date(),
		user: {} as any,
		contactUser: {} as any,
	};

	const mockContactRequest: ContactRequest = {
		id: 'request-id',
		senderId: 'sender-id',
		receiverId: 'receiver-id',
		status: ContactRequestStatus.PENDING,
		message: 'Hello',
		sentAt: new Date(),
		respondedAt: new Date(),
		sender: {} as any,
		receiver: {} as any,
	};

	const mockContactsService = {
		sendContactRequest: jest.fn(),
		getPendingRequests: jest.fn(),
		respondToContactRequest: jest.fn(),
		addContact: jest.fn(),
		getContacts: jest.fn(),
		searchContacts: jest.fn(),
		getFavoriteContacts: jest.fn(),
		getContactsCount: jest.fn(),
		getMutualContacts: jest.fn(),
		getContact: jest.fn(),
		updateContact: jest.fn(),
		toggleFavorite: jest.fn(),
		removeContact: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [ContactsController],
			providers: [
				{
					provide: ContactsService,
					useValue: mockContactsService,
				},
			],
		}).compile();

		controller = module.get<ContactsController>(ContactsController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('sendContactRequest', () => {
		it('should send a contact request', async () => {
			const dto: CreateContactRequestDto = { receiverId: 'receiver-id', message: 'Hello' };
			mockContactsService.sendContactRequest.mockResolvedValue(mockContactRequest);

			const result = await controller.sendContactRequest('sender-id', dto);
			expect(result).toEqual(mockContactRequest);
			expect(mockContactsService.sendContactRequest).toHaveBeenCalledWith(
				'sender-id',
				dto.receiverId,
				dto.message
			);
		});
	});

	describe('getPendingRequests', () => {
		it('should get pending requests', async () => {
			mockContactsService.getPendingRequests.mockResolvedValue([mockContactRequest]);
			const result = await controller.getPendingRequests('user-id', 'sent');
			expect(result).toEqual([mockContactRequest]);
			expect(mockContactsService.getPendingRequests).toHaveBeenCalledWith('user-id', 'sent');
		});
	});

	describe('respondToContactRequest', () => {
		it('should respond to a contact request', async () => {
			const dto: RespondToContactRequestDto = { status: ContactRequestStatus.ACCEPTED };
			const updatedRequest = { ...mockContactRequest, status: ContactRequestStatus.ACCEPTED };
			mockContactsService.respondToContactRequest.mockResolvedValue(updatedRequest);

			const result = await controller.respondToContactRequest('user-id', 'request-id', dto);
			expect(result).toEqual(updatedRequest);
			expect(mockContactsService.respondToContactRequest).toHaveBeenCalledWith(
				'request-id',
				'user-id',
				dto.status
			);
		});
	});

	describe('addContact', () => {
		it('should add a contact', async () => {
			const dto: AddContactDto = { contactId: 'contact-user-id' };
			mockContactsService.addContact.mockResolvedValue(mockContact);

			const result = await controller.addContact('user-id', dto);
			expect(result).toEqual(mockContact);
			expect(mockContactsService.addContact).toHaveBeenCalledWith('user-id', dto);
		});
	});

	describe('getContacts', () => {
		it('should get contacts', async () => {
			const resultMock = { contacts: [mockContact], total: 1 };
			mockContactsService.getContacts.mockResolvedValue(resultMock);

			const result = await controller.getContacts('user-id', 1, 10, false);
			expect(result).toEqual(resultMock);
			expect(mockContactsService.getContacts).toHaveBeenCalledWith('user-id', 1, 10, false);
		});
	});

	describe('searchContacts', () => {
		it('should search contacts', async () => {
			const resultMock = { contacts: [mockContact], total: 1 };
			mockContactsService.searchContacts.mockResolvedValue(resultMock);

			const result = await controller.searchContacts('user-id', 'query', 1, 10);
			expect(result).toEqual(resultMock);
			expect(mockContactsService.searchContacts).toHaveBeenCalledWith('user-id', 'query', 1, 10);
		});
	});

	describe('getFavoriteContacts', () => {
		it('should get favorite contacts', async () => {
			const resultMock = { contacts: [mockContact], total: 1 };
			mockContactsService.getFavoriteContacts.mockResolvedValue(resultMock);

			const result = await controller.getFavoriteContacts('user-id', 1, 10);
			expect(result).toEqual(resultMock);
			expect(mockContactsService.getFavoriteContacts).toHaveBeenCalledWith('user-id', 1, 10);
		});
	});

	describe('getContactsCount', () => {
		it('should get contacts count', async () => {
			mockContactsService.getContactsCount.mockResolvedValue(5);
			const result = await controller.getContactsCount('user-id');
			expect(result).toBe(5);
			expect(mockContactsService.getContactsCount).toHaveBeenCalledWith('user-id');
		});
	});

	describe('getMutualContacts', () => {
		it('should get mutual contacts', async () => {
			const resultMock = { contacts: [mockContact], total: 1 };
			mockContactsService.getMutualContacts.mockResolvedValue(resultMock);

			const result = await controller.getMutualContacts('user-id', 'other-user-id', 1, 10);
			expect(result).toEqual(resultMock);
			expect(mockContactsService.getMutualContacts).toHaveBeenCalledWith(
				'user-id',
				'other-user-id',
				1,
				10
			);
		});
	});

	describe('getContact', () => {
		it('should get a specific contact', async () => {
			mockContactsService.getContact.mockResolvedValue(mockContact);
			const result = await controller.getContact('user-id', 'contact-id');
			expect(result).toEqual(mockContact);
			expect(mockContactsService.getContact).toHaveBeenCalledWith('user-id', 'contact-id');
		});
	});

	describe('updateContact', () => {
		it('should update a contact', async () => {
			const dto: UpdateContactDto = { isFavorite: true };
			const updatedContact = { ...mockContact, isFavorite: true };
			mockContactsService.updateContact.mockResolvedValue(updatedContact);

			const result = await controller.updateContact('user-id', 'contact-id', dto);
			expect(result).toEqual(updatedContact);
			expect(mockContactsService.updateContact).toHaveBeenCalledWith('user-id', 'contact-id', dto);
		});
	});

	describe('toggleFavorite', () => {
		it('should toggle favorite status', async () => {
			const updatedContact = { ...mockContact, isFavorite: true };
			mockContactsService.toggleFavorite.mockResolvedValue(updatedContact);

			const result = await controller.toggleFavorite('user-id', 'contact-id');
			expect(result).toEqual(updatedContact);
			expect(mockContactsService.toggleFavorite).toHaveBeenCalledWith('user-id', 'contact-id');
		});
	});

	describe('removeContact', () => {
		it('should remove a contact', async () => {
			mockContactsService.removeContact.mockResolvedValue(undefined);
			await controller.removeContact('user-id', 'contact-id');
			expect(mockContactsService.removeContact).toHaveBeenCalledWith('user-id', 'contact-id');
		});
	});
});
