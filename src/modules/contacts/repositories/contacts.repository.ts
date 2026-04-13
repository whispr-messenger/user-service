import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../entities/contact.entity';
import { CursorPaginatedResult } from '../../common/dto/cursor-pagination.dto';
import { applyCursorPagination } from '../../common/utils/cursor-pagination.util';

@Injectable()
export class ContactsRepository {
	constructor(
		@InjectRepository(Contact)
		private readonly repo: Repository<Contact>
	) {}

	async findAllByOwner(ownerId: string): Promise<Contact[]> {
		return this.repo.find({ where: { ownerId }, relations: ['contact'] });
	}

	async findAllByOwnerPaginated(
		ownerId: string,
		limit: number = 50,
		cursor?: string
	): Promise<CursorPaginatedResult<Contact>> {
		const qb = this.repo
			.createQueryBuilder('contact')
			.leftJoinAndSelect('contact.contact', 'user')
			.where('contact.ownerId = :ownerId', { ownerId });

		return applyCursorPagination(qb, { alias: 'contact', limit, cursor });
	}

	async findOne(ownerId: string, contactId: string): Promise<Contact | null> {
		return this.repo.findOne({ where: { ownerId, contactId }, relations: ['contact'] });
	}

	async create(ownerId: string, contactId: string, nickname?: string): Promise<Contact> {
		const contact = this.repo.create({ ownerId, contactId, nickname: nickname ?? null });
		const saved = await this.repo.save(contact);
		const withRelations = await this.repo.findOne({
			where: { id: saved.id },
			relations: ['contact'],
		});
		return withRelations ?? saved;
	}

	async save(contact: Contact): Promise<Contact> {
		return this.repo.save(contact);
	}

	async remove(contact: Contact): Promise<void> {
		await this.repo.remove(contact);
	}
}
