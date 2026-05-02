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
import { User } from '../../common/entities/user.entity';
import { ContactRequestsRepository } from '../repositories/contact-requests.repository';
import { ContactsRepository } from '../repositories/contacts.repository';
import { Contact } from '../entities/contact.entity';
import { ContactRequest, ContactRequestStatus } from '../entities/contact-request.entity';
import { CursorPaginatedResult } from '../../common/dto/cursor-pagination.dto';
import { ContactsNotificationPublisher } from './contacts-notification-publisher.service';

@Injectable()
export class ContactRequestsService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly contactRequestsRepository: ContactRequestsRepository,
		private readonly contactsRepository: ContactsRepository,
		@InjectDataSource()
		private readonly dataSource: DataSource,
		private readonly notificationPublisher: ContactsNotificationPublisher
	) {}

	private async ensureUserExists(userId: string): Promise<User> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return user;
	}

	private displayNameOf(user: User | null | undefined): string | null {
		if (!user) return null;
		const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
		return full || user.username || null;
	}

	async sendRequest(requesterId: string, recipientId: string): Promise<ContactRequest> {
		if (requesterId === recipientId) {
			throw new BadRequestException('Cannot send a contact request to yourself');
		}

		const requester = await this.ensureUserExists(requesterId);
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

		const created = await this.contactRequestsRepository.create(requesterId, recipientId);

		// Best-effort push notification — do NOT propagate failures, the
		// contact request is the source of truth and was already committed.
		void this.notificationPublisher.publishRequestReceived({
			user_id: recipientId,
			requester_id: requesterId,
			requester_display_name: this.displayNameOf(requester),
			request_id: created.id,
		});

		return created;
	}

	async getRequestsForUser(
		userId: string,
		limit: number = 50,
		cursor?: string
	): Promise<CursorPaginatedResult<ContactRequest>> {
		await this.ensureUserExists(userId);
		return this.contactRequestsRepository.findAllForUserPaginated(userId, limit, cursor);
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

			// Notify the original requester that their request was accepted.
			// Best-effort: never throws upstream.
			const accepter = await this.userRepository.findById(request.recipientId);
			void this.notificationPublisher.publishRequestAccepted({
				user_id: request.requesterId,
				accepter_id: request.recipientId,
				accepter_display_name: this.displayNameOf(accepter),
				request_id: saved.id,
			});

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
