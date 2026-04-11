import {
	Injectable,
	NotFoundException,
	ConflictException,
	BadRequestException,
	ForbiddenException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserRepository } from '../../common/repositories';
import { ContactRequestsRepository } from '../repositories/contact-requests.repository';
import { ContactsRepository } from '../repositories/contacts.repository';
import { Contact } from '../entities/contact.entity';
import { ContactRequest, ContactRequestStatus } from '../entities/contact-request.entity';

@Injectable()
export class ContactRequestsService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly contactRequestsRepository: ContactRequestsRepository,
		private readonly contactsRepository: ContactsRepository,
		@InjectDataSource()
		private readonly dataSource: DataSource
	) {}

	private async ensureUserExists(userId: string): Promise<void> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
	}

	async sendRequest(requesterId: string, recipientId: string): Promise<ContactRequest> {
		if (requesterId === recipientId) {
			throw new BadRequestException('Cannot send a contact request to yourself');
		}

		await this.ensureUserExists(requesterId);
		await this.ensureUserExists(recipientId);

		const existingContact = await this.contactsRepository.findOne(requesterId, recipientId);
		if (existingContact) {
			throw new ConflictException('Already in contacts');
		}

		const existingRequest = await this.contactRequestsRepository.findPendingBetween(
			requesterId,
			recipientId
		);
		if (existingRequest) {
			throw new ConflictException('A pending contact request already exists');
		}

		return this.contactRequestsRepository.create(requesterId, recipientId);
	}

	async getRequestsForUser(userId: string): Promise<ContactRequest[]> {
		await this.ensureUserExists(userId);
		return this.contactRequestsRepository.findAllForUser(userId);
	}

	async acceptRequest(requestId: string, userId: string): Promise<ContactRequest> {
		const request = await this.contactRequestsRepository.findById(requestId);
		if (!request) {
			throw new NotFoundException('Contact request not found');
		}

		if (request.recipientId !== userId) {
			throw new ForbiddenException('Only the recipient can accept a contact request');
		}

		if (request.status !== ContactRequestStatus.PENDING) {
			throw new ConflictException('Contact request is not pending');
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			const contactRepo = queryRunner.manager.getRepository(Contact);
			const requestRepo = queryRunner.manager.getRepository(ContactRequest);

			const existingAB = await contactRepo.findOne({
				where: { ownerId: request.requesterId, contactId: request.recipientId },
			});
			if (!existingAB) {
				await contactRepo.save(
					contactRepo.create({
						ownerId: request.requesterId,
						contactId: request.recipientId,
						nickname: null,
					})
				);
			}

			const existingBA = await contactRepo.findOne({
				where: { ownerId: request.recipientId, contactId: request.requesterId },
			});
			if (!existingBA) {
				await contactRepo.save(
					contactRepo.create({
						ownerId: request.recipientId,
						contactId: request.requesterId,
						nickname: null,
					})
				);
			}

			request.status = ContactRequestStatus.ACCEPTED;
			const saved = await requestRepo.save(request);

			await queryRunner.commitTransaction();
			return saved;
		} catch (err) {
			await queryRunner.rollbackTransaction();
			throw err;
		} finally {
			await queryRunner.release();
		}
	}

	async rejectRequest(requestId: string, userId: string): Promise<ContactRequest> {
		const request = await this.contactRequestsRepository.findById(requestId);
		if (!request) {
			throw new NotFoundException('Contact request not found');
		}

		if (request.recipientId !== userId) {
			throw new ForbiddenException('Only the recipient can reject a contact request');
		}

		if (request.status !== ContactRequestStatus.PENDING) {
			throw new ConflictException('Contact request is not pending');
		}

		request.status = ContactRequestStatus.REJECTED;
		return this.contactRequestsRepository.save(request);
	}

	async cancelRequest(requestId: string, userId: string): Promise<void> {
		const request = await this.contactRequestsRepository.findById(requestId);
		if (!request) {
			throw new NotFoundException('Contact request not found');
		}

		if (request.requesterId !== userId) {
			throw new ForbiddenException('Only the requester can cancel a contact request');
		}

		if (request.status !== ContactRequestStatus.PENDING) {
			throw new ConflictException('Contact request is not pending');
		}

		await this.contactRequestsRepository.remove(request);
	}
}
