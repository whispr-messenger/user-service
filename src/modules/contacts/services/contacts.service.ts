import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UserRepository } from '../../common/repositories';
import { ContactsRepository } from '../repositories/contacts.repository';
import { Contact } from '../entities/contact.entity';
import { AddContactDto } from '../dto/add-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { CursorPaginatedResult } from '../../common/dto/cursor-pagination.dto';

@Injectable()
export class ContactsService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly contactsRepository: ContactsRepository
	) {}

	private async ensureUserExists(userId: string): Promise<void> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
	}

	async getContacts(
		ownerId: string,
		limit: number = 50,
		cursor?: string
	): Promise<CursorPaginatedResult<Contact>> {
		await this.ensureUserExists(ownerId);
		return this.contactsRepository.findAllByOwnerPaginated(ownerId, limit, cursor);
	}

	async addContact(ownerId: string, dto: AddContactDto): Promise<Contact> {
		if (ownerId === dto.contactId) {
			throw new BadRequestException('Cannot add yourself as a contact');
		}

		await this.ensureUserExists(ownerId);
		await this.ensureUserExists(dto.contactId);

		const existing = await this.contactsRepository.findOne(ownerId, dto.contactId);
		if (existing) {
			throw new ConflictException('Contact already exists');
		}

		return this.contactsRepository.create(ownerId, dto.contactId, dto.nickname);
	}

	async removeContact(ownerId: string, contactId: string): Promise<void> {
		await this.ensureUserExists(ownerId);

		const contact = await this.contactsRepository.findOne(ownerId, contactId);
		if (!contact) {
			throw new NotFoundException('Contact not found');
		}

		await this.contactsRepository.remove(contact);
	}

	async updateContact(ownerId: string, contactId: string, dto: UpdateContactDto): Promise<Contact> {
		await this.ensureUserExists(ownerId);

		const contact = await this.contactsRepository.findOne(ownerId, contactId);
		if (!contact) {
			throw new NotFoundException('Contact not found');
		}

		if (dto.nickname === undefined) {
			return contact;
		}

		contact.nickname = dto.nickname;
		return this.contactsRepository.save(contact);
	}
}
