/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { Contact, User, BlockedUser, ContactRequest, ContactRequestStatus } from '../entities';
import { AddContactDto, UpdateContactDto } from '../dto';
import { PrivacyService } from '../privacy/privacy.service';

describe('ContactsService', () => {
	let service: ContactsService;
	let contactRepository: Repository<Contact>;
	let userRepository: Repository<User>;
	let blockedUserRepository: Repository<BlockedUser>;
	let contactRequestRepository: Repository<ContactRequest>;
	let privacyService: PrivacyService;

	const mockUser: User = {
		id: '123e4567-e89b-12d3-a456-426614174000',
		username: 'testuser',
		phoneNumber: '+1234567890',
		firstName: 'Test',
		lastName: 'User',
		biography: 'Test biography',
		profilePictureUrl: 'https://example.com/avatar.jpg',
		lastSeen: new Date(),
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		privacySettings: null,
		contacts: [],
		contactedBy: [],
		blockedUsers: [],
		blockedBy: [],
		createdGroups: [],
		groupMemberships: [],
		searchIndex: null,
	};

	const mockContactUser: User = {
		id: '123e4567-e89b-12d3-a456-426614174001',
		username: 'contactuser',
		phoneNumber: '+1234567891',
		firstName: 'Contact',
		lastName: 'User',
		biography: 'Contact biography',
		profilePictureUrl: 'https://example.com/contact.jpg',
		lastSeen: new Date(),
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		privacySettings: null,
		contacts: [],
		contactedBy: [],
		blockedUsers: [],
		blockedBy: [],
		createdGroups: [],
		groupMemberships: [],
		searchIndex: null,
	};

	const mockContact: Contact = {
		id: '123e4567-e89b-12d3-a456-426614174002',
		userId: mockUser.id,
		contactId: mockContactUser.id,
		nickname: 'My Contact',
		isFavorite: false,
		addedAt: new Date(),
		updatedAt: new Date(),
		user: mockUser,
		contactUser: mockContactUser,
	};

	const mockContactRequest: ContactRequest = {
		id: '123e4567-e89b-12d3-a456-426614174003',
		senderId: mockUser.id,
		receiverId: mockContactUser.id,
		status: ContactRequestStatus.PENDING,
		message: 'Hello',
		sentAt: new Date(),
		respondedAt: null,
		sender: mockUser,
		receiver: mockContactUser,
	};

	const mockContactRepository = {
		create: jest.fn(),
		save: jest.fn(),
		findOne: jest.fn(),
		find: jest.fn(),
		createQueryBuilder: jest.fn(),
		remove: jest.fn(),
		count: jest.fn(),
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

	const mockPrivacyService = {
		filterUserData: jest.fn(),
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
				{
					provide: PrivacyService,
					useValue: mockPrivacyService,
				},
			],
		}).compile();

		service = module.get<ContactsService>(ContactsService);
		contactRepository = module.get<Repository<Contact>>(getRepositoryToken(Contact));
		userRepository = module.get<Repository<User>>(getRepositoryToken(User));
		blockedUserRepository = module.get<Repository<BlockedUser>>(getRepositoryToken(BlockedUser));
		contactRequestRepository = module.get<Repository<ContactRequest>>(getRepositoryToken(ContactRequest));
		privacyService = module.get<PrivacyService>(PrivacyService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('addContact', () => {
		it('should add a contact successfully', async () => {
			const addContactDto: AddContactDto = {
				contactId: mockContactUser.id,
				nickname: 'My Contact',
			};

			mockUserRepository.findOne.mockResolvedValue(mockContactUser);
			mockContactRepository.findOne.mockResolvedValue(null);
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockContactRepository.create.mockReturnValue(mockContact);
			mockContactRepository.save.mockResolvedValue(mockContact);

			const result = await service.addContact(mockUser.id, addContactDto);

			expect(result).toEqual(mockContact);
			expect(mockContactRepository.save).toHaveBeenCalledWith(mockContact);
		});

		it('should throw NotFoundException if contact user not found', async () => {
			const addContactDto: AddContactDto = {
				contactId: 'nonexistent',
			};

			mockUserRepository.findOne.mockResolvedValue(null);

			await expect(service.addContact(mockUser.id, addContactDto)).rejects.toThrow(NotFoundException);
		});

		it('should throw ConflictException if contact already exists', async () => {
			const addContactDto: AddContactDto = {
				contactId: mockContactUser.id,
			};

			mockUserRepository.findOne.mockResolvedValue(mockContactUser);
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockContactRepository.findOne.mockResolvedValue(mockContact);

			await expect(service.addContact(mockUser.id, addContactDto)).rejects.toThrow(ConflictException);
		});

		it('should throw BadRequestException if user is blocked', async () => {
			const addContactDto: AddContactDto = {
				contactId: mockContactUser.id,
			};
			const mockBlockedUser = {
				id: '123',
				userId: mockContactUser.id,
				blockedUserId: mockUser.id,
			};

			mockUserRepository.findOne.mockResolvedValue(mockContactUser);
			mockBlockedUserRepository.findOne.mockResolvedValue(mockBlockedUser);

			await expect(service.addContact(mockUser.id, addContactDto)).rejects.toThrow(BadRequestException);
		});
	});

	describe('sendContactRequest', () => {
		it('should send a contact request successfully', async () => {
			mockUserRepository.findOne.mockResolvedValue(mockContactUser);
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockContactRepository.findOne.mockResolvedValue(null); // Not already contacts
			mockContactRequestRepository.findOne.mockResolvedValue(null); // No existing request
			mockContactRequestRepository.create.mockReturnValue(mockContactRequest);
			mockContactRequestRepository.save.mockResolvedValue(mockContactRequest);

			const result = await service.sendContactRequest(mockUser.id, mockContactUser.id, 'Hello');

			expect(result).toEqual(mockContactRequest);
			expect(mockContactRequestRepository.save).toHaveBeenCalledWith(mockContactRequest);
		});

		it('should throw ConflictException if request already exists', async () => {
			mockUserRepository.findOne.mockResolvedValue(mockContactUser);
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockContactRepository.findOne.mockResolvedValue(null);
			mockContactRequestRepository.findOne.mockResolvedValue(mockContactRequest);

			await expect(service.sendContactRequest(mockUser.id, mockContactUser.id)).rejects.toThrow(ConflictException);
		});
	});

	describe('respondToContactRequest', () => {
		it('should accept a contact request successfully', async () => {
			const requestId = mockContactRequest.id;
			const userId = mockContactUser.id; // Receiver
			const status = ContactRequestStatus.ACCEPTED;

			const request = { ...mockContactRequest, receiverId: userId };
			mockContactRequestRepository.findOne.mockResolvedValue(request);
			mockContactRequestRepository.save.mockResolvedValue({ ...request, status });
			mockContactRepository.create.mockReturnValue(mockContact);
			mockContactRepository.save.mockResolvedValue(mockContact);

			const result = await service.respondToContactRequest(requestId, userId, status);

			expect(result.status).toBe(status);
			expect(mockContactRequestRepository.save).toHaveBeenCalled();
			expect(mockContactRepository.save).toHaveBeenCalledTimes(2); // Mutual contacts
		});

		it('should reject a contact request successfully', async () => {
			const requestId = mockContactRequest.id;
			const userId = mockContactUser.id; // Receiver
			const status = ContactRequestStatus.REJECTED;

			const request = { ...mockContactRequest, receiverId: userId };
			mockContactRequestRepository.findOne.mockResolvedValue(request);
			mockContactRequestRepository.save.mockResolvedValue({ ...request, status });

			const result = await service.respondToContactRequest(requestId, userId, status);

			expect(result.status).toBe(status);
			expect(mockContactRequestRepository.save).toHaveBeenCalled();
			expect(mockContactRepository.save).not.toHaveBeenCalled(); // No mutual contacts
		});
	});

	describe('getContacts', () => {
		it('should return user contacts', async () => {
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
			mockPrivacyService.filterUserData.mockResolvedValue(mockContactUser);

			const result = await service.getContacts(mockUser.id);

			expect(result.contacts).toHaveLength(1);
			expect(result.total).toBe(1);
			expect(mockQueryBuilder.where).toHaveBeenCalledWith('contact.userId = :userId', {
				userId: mockUser.id,
			});
		});
	});

	describe('getContact', () => {
		it('should return a contact by id', async () => {
			mockContactRepository.findOne.mockResolvedValue(mockContact);

			const result = await service.getContact(mockUser.id, mockContactUser.id);

			expect(result).toEqual(mockContact);
			expect(mockContactRepository.findOne).toHaveBeenCalledWith({
				where: { userId: mockUser.id, contactId: mockContactUser.id },
				relations: ['contactUser'],
			});
		});

		it('should throw NotFoundException if contact not found', async () => {
			mockContactRepository.findOne.mockResolvedValue(null);

			await expect(service.getContact(mockUser.id, 'nonexistent')).rejects.toThrow(NotFoundException);
		});
	});

	describe('updateContact', () => {
		it('should update a contact successfully', async () => {
			const updateContactDto: UpdateContactDto = {
				nickname: 'Updated Nickname',
				isFavorite: true,
			};
			const updatedContact = { ...mockContact, ...updateContactDto };

			mockContactRepository.findOne.mockResolvedValue(mockContact);
			mockContactRepository.save.mockResolvedValue(updatedContact);

			const result = await service.updateContact(mockUser.id, mockContactUser.id, updateContactDto);

			expect(result).toEqual(updatedContact);
			expect(mockContactRepository.save).toHaveBeenCalledWith({
				...mockContact,
				...updateContactDto,
			});
		});

		it('should throw NotFoundException if contact not found', async () => {
			const updateContactDto: UpdateContactDto = {
				nickname: 'Updated Nickname',
			};

			mockContactRepository.findOne.mockResolvedValue(null);

			await expect(service.updateContact(mockUser.id, 'nonexistent', updateContactDto)).rejects.toThrow(
				NotFoundException
			);
		});
	});

	describe('removeContact', () => {
		it('should remove a contact successfully', async () => {
			mockContactRepository.findOne.mockResolvedValue(mockContact);
			mockContactRepository.remove.mockResolvedValue(mockContact);

			await service.removeContact(mockUser.id, mockContactUser.id);

			expect(mockContactRepository.remove).toHaveBeenCalledWith(mockContact);
		});

		it('should throw NotFoundException if contact not found', async () => {
			mockContactRepository.findOne.mockResolvedValue(null);

			await expect(service.removeContact(mockUser.id, 'nonexistent')).rejects.toThrow(
				NotFoundException
			);
		});
	});

	describe('searchContacts', () => {
		it('should search contacts by query', async () => {
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
		});
	});
});
