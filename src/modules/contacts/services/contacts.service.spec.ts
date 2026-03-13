import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { UserRepository } from '../../common/repositories';
import { ContactsRepository } from '../repositories/contacts.repository';
import { Contact } from '../entities/contact.entity';
import { User } from '../../common/entities/user.entity';
import { AddContactDto } from '../dto/add-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';

const mockUser = (id: string = 'uuid-1'): User =>
	({
		id,
		phoneNumber: '+33600000001',
		username: null,
		firstName: null,
		lastName: null,
		biography: null,
		profilePictureUrl: null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	}) as User;

const mockContact = (): Contact =>
	({
		id: 'contact-uuid-1',
		ownerId: 'uuid-1',
		contactId: 'uuid-2',
		nickname: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	}) as Contact;

describe('ContactsService', () => {
	let service: ContactsService;
	let userRepository: jest.Mocked<UserRepository>;
	let contactsRepository: jest.Mocked<ContactsRepository>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ContactsService,
				{
					provide: UserRepository,
					useValue: {
						findById: jest.fn(),
					},
				},
				{
					provide: ContactsRepository,
					useValue: {
						findAllByOwner: jest.fn(),
						findOne: jest.fn(),
						create: jest.fn(),
						save: jest.fn(),
						remove: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<ContactsService>(ContactsService);
		userRepository = module.get(UserRepository);
		contactsRepository = module.get(ContactsRepository);
	});

	describe('getContacts', () => {
		it('returns contacts for a valid owner', async () => {
			const user = mockUser();
			const contacts = [mockContact()];
			userRepository.findById.mockResolvedValue(user);
			contactsRepository.findAllByOwner.mockResolvedValue(contacts);

			const result = await service.getContacts('uuid-1');

			expect(result).toBe(contacts);
			expect(contactsRepository.findAllByOwner).toHaveBeenCalledWith('uuid-1');
		});

		it('throws NotFoundException when owner does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.getContacts('uuid-1')).rejects.toThrow(NotFoundException);
		});
	});

	describe('addContact', () => {
		it('adds and returns a new contact', async () => {
			const owner = mockUser('uuid-1');
			const contactUser = mockUser('uuid-2');
			const contact = mockContact();
			const dto: AddContactDto = { contactId: 'uuid-2' };

			userRepository.findById.mockResolvedValueOnce(owner).mockResolvedValueOnce(contactUser);
			contactsRepository.findOne.mockResolvedValue(null);
			contactsRepository.create.mockResolvedValue(contact);

			const result = await service.addContact('uuid-1', dto);

			expect(result).toBe(contact);
			expect(contactsRepository.create).toHaveBeenCalledWith('uuid-1', 'uuid-2', undefined);
		});

		it('passes nickname when provided', async () => {
			const owner = mockUser('uuid-1');
			const contactUser = mockUser('uuid-2');
			const contact = { ...mockContact(), nickname: 'Alice' } as Contact;
			const dto: AddContactDto = { contactId: 'uuid-2', nickname: 'Alice' };

			userRepository.findById.mockResolvedValueOnce(owner).mockResolvedValueOnce(contactUser);
			contactsRepository.findOne.mockResolvedValue(null);
			contactsRepository.create.mockResolvedValue(contact);

			const result = await service.addContact('uuid-1', dto);

			expect(contactsRepository.create).toHaveBeenCalledWith('uuid-1', 'uuid-2', 'Alice');
			expect(result).toBe(contact);
		});

		it('throws BadRequestException when owner adds themselves', async () => {
			const dto: AddContactDto = { contactId: 'uuid-1' };

			await expect(service.addContact('uuid-1', dto)).rejects.toThrow(BadRequestException);
		});

		it('throws NotFoundException when owner does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.addContact('uuid-1', { contactId: 'uuid-2' })).rejects.toThrow(
				NotFoundException
			);
		});

		it('throws NotFoundException when contact user does not exist', async () => {
			const owner = mockUser('uuid-1');
			userRepository.findById.mockResolvedValueOnce(owner).mockResolvedValueOnce(null);

			await expect(service.addContact('uuid-1', { contactId: 'uuid-2' })).rejects.toThrow(
				NotFoundException
			);
		});

		it('throws ConflictException when contact already exists', async () => {
			const owner = mockUser('uuid-1');
			const contactUser = mockUser('uuid-2');
			const existing = mockContact();

			userRepository.findById.mockResolvedValueOnce(owner).mockResolvedValueOnce(contactUser);
			contactsRepository.findOne.mockResolvedValue(existing);

			await expect(service.addContact('uuid-1', { contactId: 'uuid-2' })).rejects.toThrow(
				ConflictException
			);
		});
	});

	describe('updateContact', () => {
		it('updates and returns the contact', async () => {
			const owner = mockUser('uuid-1');
			const contact = mockContact();
			const dto: UpdateContactDto = { nickname: 'Updated' };
			const saved = { ...contact, nickname: 'Updated' } as Contact;

			userRepository.findById.mockResolvedValue(owner);
			contactsRepository.findOne.mockResolvedValue(contact);
			contactsRepository.save.mockResolvedValue(saved);

			const result = await service.updateContact('uuid-1', 'uuid-2', dto);

			expect(contactsRepository.save).toHaveBeenCalledWith(expect.objectContaining(dto));
			expect(result).toBe(saved);
		});

		it('throws NotFoundException when owner does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.updateContact('uuid-1', 'uuid-2', { nickname: 'X' })).rejects.toThrow(
				NotFoundException
			);
		});

		it('throws NotFoundException when contact does not exist', async () => {
			const owner = mockUser('uuid-1');

			userRepository.findById.mockResolvedValue(owner);
			contactsRepository.findOne.mockResolvedValue(null);

			await expect(service.updateContact('uuid-1', 'uuid-2', { nickname: 'X' })).rejects.toThrow(
				NotFoundException
			);
		});
	});

	describe('removeContact', () => {
		it('removes the contact when it exists', async () => {
			const owner = mockUser('uuid-1');
			const contact = mockContact();

			userRepository.findById.mockResolvedValue(owner);
			contactsRepository.findOne.mockResolvedValue(contact);

			await service.removeContact('uuid-1', 'uuid-2');

			expect(contactsRepository.remove).toHaveBeenCalledWith(contact);
		});

		it('throws NotFoundException when owner does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.removeContact('uuid-1', 'uuid-2')).rejects.toThrow(NotFoundException);
		});

		it('throws NotFoundException when contact does not exist', async () => {
			const owner = mockUser('uuid-1');

			userRepository.findById.mockResolvedValue(owner);
			contactsRepository.findOne.mockResolvedValue(null);

			await expect(service.removeContact('uuid-1', 'uuid-2')).rejects.toThrow(NotFoundException);
		});
	});
});
