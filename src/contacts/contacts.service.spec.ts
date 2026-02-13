import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContactsService } from './contacts.service';
import { Contact, User, BlockedUser, ContactRequest, ContactRequestStatus } from '../entities';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('ContactsService', () => {
	let service: ContactsService;

	const mockUser = {
		id: 'user-id',
		username: 'user',
		email: 'user@example.com',
	} as unknown as User;

	const mockContactUser = {
		id: 'contact-id',
		username: 'contact',
		email: 'contact@example.com',
	} as unknown as User;

	const mockContact = {
		id: 'contact-entry-id',
		userId: mockUser.id,
		contactId: mockContactUser.id,
		nickname: 'My Contact',
		isFavorite: false,
		addedAt: new Date(),
		updatedAt: new Date(),
		contactUser: mockContactUser,
	} as unknown as Contact;

	const mockContactRequest = {
		id: 'request-id',
		senderId: mockUser.id,
		receiverId: mockContactUser.id,
		status: ContactRequestStatus.PENDING,
		sentAt: new Date(),
	} as unknown as ContactRequest;

	const mockContactRepository = {
		create: jest.fn(),
		save: jest.fn(),
		findOne: jest.fn(),
		find: jest.fn(),
		update: jest.fn(),
		remove: jest.fn(),
		count: jest.fn(),
		createQueryBuilder: jest.fn(),
	};

	const mockUserRepository = {
		findOne: jest.fn(),
	};

	const mockBlockedUserRepository = {
		findOne: jest.fn(),
	};

	const mockContactRequestRepository = {
		create: jest.fn(),
		save: jest.fn(),
		findOne: jest.fn(),
		find: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ContactsService,
				{
					provide: getRepositoryToken(Contact),
					useValue: mockContactRepository,
				},
				{
					provide: getRepositoryToken(User),
					useValue: mockUserRepository,
				},
				{
					provide: getRepositoryToken(BlockedUser),
					useValue: mockBlockedUserRepository,
				},
				{
					provide: getRepositoryToken(ContactRequest),
					useValue: mockContactRequestRepository,
				},
			],
		}).compile();

		service = module.get<ContactsService>(ContactsService);

		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('sendContactRequest', () => {
		it('should send a contact request successfully', async () => {
			mockUserRepository.findOne.mockResolvedValue(mockContactUser);
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockContactRepository.findOne.mockResolvedValue(null); // Not already contacts
			mockContactRequestRepository.findOne.mockResolvedValue(null); // No pending request
			mockContactRequestRepository.create.mockReturnValue(mockContactRequest);
			mockContactRequestRepository.save.mockResolvedValue(mockContactRequest);

			const result = await service.sendContactRequest(mockUser.id, mockContactUser.id);

			expect(result).toEqual(mockContactRequest);
			expect(mockContactRequestRepository.save).toHaveBeenCalled();
		});

		it('should throw BadRequestException if sending to self', async () => {
			await expect(service.sendContactRequest(mockUser.id, mockUser.id)).rejects.toThrow(
				BadRequestException
			);
		});

		it('should throw NotFoundException if receiver not found', async () => {
			mockUserRepository.findOne.mockResolvedValue(null);
			await expect(service.sendContactRequest(mockUser.id, 'non-existent')).rejects.toThrow(
				NotFoundException
			);
		});

		it('should throw ConflictException if users are already contacts', async () => {
			mockUserRepository.findOne.mockResolvedValue(mockContactUser);
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockContactRepository.findOne.mockResolvedValue(mockContact); // Already contacts

			await expect(service.sendContactRequest(mockUser.id, mockContactUser.id)).rejects.toThrow(
				ConflictException
			);
		});
	});

	describe('getPendingRequests', () => {
		it('should return pending requests', async () => {
			mockContactRequestRepository.find.mockResolvedValue([mockContactRequest]);

			const result = await service.getPendingRequests(mockUser.id, 'sent');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(mockContactRequest);
			expect(mockContactRequestRepository.find).toHaveBeenCalledWith({
				where: { senderId: mockUser.id, status: ContactRequestStatus.PENDING },
				relations: ['receiver'],
				order: { sentAt: 'DESC' },
			});
		});
	});

	describe('addContact', () => {
		it('should add a contact successfully', async () => {
			const addContactDto = { contactId: mockContactUser.id, nickname: 'Nickname' };
			mockUserRepository.findOne.mockResolvedValue(mockContactUser);
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockContactRepository.findOne.mockResolvedValue(null);
			mockContactRepository.create.mockReturnValue(mockContact);
			mockContactRepository.save.mockResolvedValue(mockContact);

			const result = await service.addContact(mockUser.id, addContactDto);

			expect(result).toEqual(mockContact);
			expect(mockContactRepository.save).toHaveBeenCalled();
		});

		it('should throw BadRequestException if adding self', async () => {
			await expect(service.addContact(mockUser.id, { contactId: mockUser.id })).rejects.toThrow(
				BadRequestException
			);
		});

		it('should throw NotFoundException if contact user not found', async () => {
			mockUserRepository.findOne.mockResolvedValue(null);
			await expect(service.addContact(mockUser.id, { contactId: 'non-existent' })).rejects.toThrow(
				NotFoundException
			);
		});

		it('should throw ConflictException if contact already exists', async () => {
			mockUserRepository.findOne.mockResolvedValue(mockContactUser);
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockContactRepository.findOne.mockResolvedValue(mockContact);

			await expect(service.addContact(mockUser.id, { contactId: mockContactUser.id })).rejects.toThrow(
				ConflictException
			);
		});
	});

	describe('getContacts', () => {
		it('should return contacts', async () => {
			const mockQueryBuilder = {
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getManyAndCount: jest.fn().mockResolvedValue([[mockContact], 1]),
			};

			mockContactRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

			const result = await service.getContacts(mockUser.id);

			expect(result.contacts).toHaveLength(1);
			expect(result.total).toBe(1);
			expect(mockContactRepository.createQueryBuilder).toHaveBeenCalledWith('contact');
		});
	});

	describe('getContact', () => {
		it('should return a specific contact', async () => {
			mockContactRepository.findOne.mockResolvedValue(mockContact);
			const result = await service.getContact(mockUser.id, mockContactUser.id);
			expect(result).toEqual(mockContact);
		});

		it('should throw NotFoundException if contact not found', async () => {
			mockContactRepository.findOne.mockResolvedValue(null);
			await expect(service.getContact(mockUser.id, 'non-existent')).rejects.toThrow(NotFoundException);
		});
	});

	describe('updateContact', () => {
		it('should update a contact', async () => {
			mockContactRepository.findOne.mockResolvedValue(mockContact);
			mockContactRepository.save.mockResolvedValue({ ...mockContact, nickname: 'Updated' });

			const result = await service.updateContact(mockUser.id, mockContactUser.id, {
				nickname: 'Updated',
			});

			expect(result.nickname).toBe('Updated');
		});
	});

	describe('removeContact', () => {
		it('should remove a contact', async () => {
			mockContactRepository.findOne.mockResolvedValue(mockContact);
			mockContactRepository.remove.mockResolvedValue(mockContact);

			await service.removeContact(mockUser.id, mockContactUser.id);

			expect(mockContactRepository.remove).toHaveBeenCalledWith(mockContact);
		});
	});

	describe('searchContacts', () => {
		it('should search contacts', async () => {
			const mockQueryBuilder = {
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getManyAndCount: jest.fn().mockResolvedValue([[mockContact], 1]),
			};

			mockContactRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

			const result = await service.searchContacts(mockUser.id, 'query');

			expect(result.contacts).toHaveLength(1);
			expect(result.total).toBe(1);
			expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
		});
	});

	describe('respondToContactRequest', () => {
		it('should accept a contact request', async () => {
			const pendingRequest = {
				...mockContactRequest,
				receiverId: mockUser.id,
				senderId: mockContactUser.id,
			};
			mockContactRequestRepository.findOne.mockResolvedValue(pendingRequest);
			mockContactRequestRepository.save.mockImplementation((req) => Promise.resolve(req));
			mockContactRepository.create.mockReturnValue(mockContact);
			mockContactRepository.save.mockResolvedValue(mockContact);

			const result = await service.respondToContactRequest(
				pendingRequest.id as string,
				mockUser.id,
				ContactRequestStatus.ACCEPTED
			);

			expect(result.status).toBe(ContactRequestStatus.ACCEPTED);
			expect(mockContactRepository.save).toHaveBeenCalledTimes(2); // Mutual contacts created
		});

		it('should throw NotFoundException if request not found', async () => {
			mockContactRequestRepository.findOne.mockResolvedValue(null);

			await expect(
				service.respondToContactRequest('invalid-id', mockUser.id, ContactRequestStatus.ACCEPTED)
			).rejects.toThrow(NotFoundException);
		});
	});

	describe('getFavoriteContacts', () => {
		it('should return favorite contacts', async () => {
			const mockQueryBuilder = {
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getManyAndCount: jest.fn().mockResolvedValue([[mockContact], 1]),
			};

			mockContactRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

			const result = await service.getFavoriteContacts(mockUser.id);

			expect(result.contacts).toHaveLength(1);
			expect(result.total).toBe(1);
			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('contact.isFavorite = :isFavorite', {
				isFavorite: true,
			});
		});
	});

	describe('toggleFavorite', () => {
		it('should toggle favorite status', async () => {
			mockContactRepository.findOne.mockResolvedValue({ ...mockContact, isFavorite: false });
			mockContactRepository.save.mockImplementation((contact) => Promise.resolve(contact));

			const result = await service.toggleFavorite(mockUser.id, mockContactUser.id);

			expect(result.isFavorite).toBe(true);
		});

		it('should throw NotFoundException if contact not found', async () => {
			mockContactRepository.findOne.mockResolvedValue(null);

			await expect(service.toggleFavorite(mockUser.id, 'non-existent')).rejects.toThrow(
				NotFoundException
			);
		});
	});

	describe('areUsersContacts', () => {
		it('should return true if users are contacts', async () => {
			mockContactRepository.findOne.mockResolvedValue(mockContact);
			const result = await service.areUsersContacts(mockUser.id, mockContactUser.id);
			expect(result).toBe(true);
		});

		it('should return false if users are not contacts', async () => {
			mockContactRepository.findOne.mockResolvedValue(null);
			const result = await service.areUsersContacts(mockUser.id, mockContactUser.id);
			expect(result).toBe(false);
		});
	});

	describe('getContactsCount', () => {
		it('should return the count of contacts', async () => {
			mockContactRepository.count.mockResolvedValue(5);
			const result = await service.getContactsCount(mockUser.id);
			expect(result).toBe(5);
		});
	});

	describe('getMutualContacts', () => {
		it('should return mutual contacts', async () => {
			const mockQueryBuilder = {
				innerJoin: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				orderBy: jest.fn().mockReturnThis(),
				skip: jest.fn().mockReturnThis(),
				take: jest.fn().mockReturnThis(),
				getManyAndCount: jest.fn().mockResolvedValue([[mockContact], 1]),
			};

			mockContactRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

			const result = await service.getMutualContacts(mockUser.id, 'other-user-id');

			expect(result.contacts).toHaveLength(1);
			expect(result.total).toBe(1);
		});
	});
});
