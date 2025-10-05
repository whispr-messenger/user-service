import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact, User, BlockedUser } from '../entities';
import { AddContactDto, UpdateContactDto } from '../dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BlockedUser)
    private readonly blockedUserRepository: Repository<BlockedUser>,
  ) {}

  async addContact(
    userId: string,
    addContactDto: AddContactDto,
  ): Promise<Contact> {
    // Vérifier que l'utilisateur ne s'ajoute pas lui-même
    if (userId === addContactDto.contactId) {
      throw new BadRequestException('Cannot add yourself as a contact');
    }

    // Vérifier que l'utilisateur cible existe
    const contactUser = await this.userRepository.findOne({
      where: { id: addContactDto.contactId },
    });
    if (!contactUser) {
      throw new NotFoundException('Contact user not found');
    }

    // Vérifier que l'utilisateur cible n'est pas bloqué
    const isBlocked = await this.blockedUserRepository.findOne({
      where: [
        { userId, blockedUserId: addContactDto.contactId },
        { userId: addContactDto.contactId, blockedUserId: userId },
      ],
    });
    if (isBlocked) {
      throw new BadRequestException('Cannot add blocked user as contact');
    }

    // Vérifier que le contact n'existe pas déjà
    const existingContact = await this.contactRepository.findOne({
      where: {
        userId,
        contactId: addContactDto.contactId,
      },
    });
    if (existingContact) {
      throw new ConflictException('Contact already exists');
    }

    const contact = this.contactRepository.create({
      userId,
      contactId: addContactDto.contactId,
      nickname: addContactDto.nickname,
    });

    return this.contactRepository.save(contact);
  }

  async getContacts(
    userId: string,
    page: number = 1,
    limit: number = 10,
    favorites: boolean = false,
  ): Promise<{ contacts: Contact[]; total: number }> {
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.contactUser', 'contactUser')
      .where('contact.userId = :userId', { userId })
      .orderBy('contact.addedAt', 'DESC');

    if (favorites) {
      queryBuilder.andWhere('contact.isFavorite = :isFavorite', {
        isFavorite: true,
      });
    }

    const [contacts, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { contacts, total };
  }

  async getContact(userId: string, contactId: string): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: {
        userId,
        contactId,
      },
      relations: ['contactUser'],
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async updateContact(
    userId: string,
    contactId: string,
    updateContactDto: UpdateContactDto,
  ): Promise<Contact> {
    const contact = await this.getContact(userId, contactId);

    Object.assign(contact, updateContactDto);
    return this.contactRepository.save(contact);
  }

  async removeContact(userId: string, contactId: string): Promise<void> {
    const contact = await this.getContact(userId, contactId);
    await this.contactRepository.remove(contact);
  }

  async searchContacts(
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ contacts: Contact[]; total: number }> {
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.contactUser', 'contactUser')
      .where('contact.userId = :userId', { userId })
      .andWhere(
        '(contact.nickname ILIKE :query OR contactUser.firstName ILIKE :query OR contactUser.lastName ILIKE :query OR contactUser.username ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('contact.addedAt', 'DESC');

    const [contacts, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { contacts, total };
  }

  async getFavoriteContacts(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ contacts: Contact[]; total: number }> {
    return this.getContacts(userId, page, limit, true);
  }

  async toggleFavorite(userId: string, contactId: string): Promise<Contact> {
    const contact = await this.getContact(userId, contactId);
    contact.isFavorite = !contact.isFavorite;
    return this.contactRepository.save(contact);
  }

  async areUsersContacts(userId1: string, userId2: string): Promise<boolean> {
    const contact = await this.contactRepository.findOne({
      where: [
        { userId: userId1, contactId: userId2 },
        { userId: userId2, contactId: userId1 },
      ],
    });

    return !!contact;
  }

  async getContactsCount(userId: string): Promise<number> {
    return this.contactRepository.count({
      where: { userId },
    });
  }

  async getMutualContacts(
    userId1: string,
    userId2: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ contacts: Contact[]; total: number }> {
    const queryBuilder = this.contactRepository
      .createQueryBuilder('contact1')
      .innerJoin(
        'contact',
        'contact2',
        'contact1.contactId = contact2.contactId AND contact1.userId != contact2.userId',
      )
      .leftJoinAndSelect('contact1.contactUser', 'contactUser')
      .where('contact1.userId = :userId1 AND contact2.userId = :userId2', {
        userId1,
        userId2,
      })
      .orderBy('contact1.addedAt', 'DESC');

    const [contacts, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { contacts, total };
  }
}
