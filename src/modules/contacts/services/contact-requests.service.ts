import {
	Injectable,
	NotFoundException,
	ConflictException,
	BadRequestException,
	ForbiddenException,
} from '@nestjs/common';
import { UserRepository } from '../../common/repositories';
import { ContactRequestsRepository } from '../repositories/contact-requests.repository';
import { ContactsRepository } from '../repositories/contacts.repository';
import { ContactRequest, ContactRequestStatus } from '../entities/contact-request.entity';

@Injectable()
export class ContactRequestsService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly contactRequestsRepository: ContactRequestsRepository,
		private readonly contactsRepository: ContactsRepository
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

		// Check if already contacts
		const existingContact = await this.contactsRepository.findOne(requesterId, recipientId);
		if (existingContact) {
			throw new ConflictException('Already in contacts');
		}

		// Check for existing pending request in either direction
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
		const requests = await this.contactRequestsRepository.findAllForUser(userId);

		// Enrich with user data
		const enriched = await Promise.all(
			requests.map(async (request) => {
				const [requester, recipient] = await Promise.all([
					this.userRepository.findById(request.requesterId),
					this.userRepository.findById(request.recipientId),
				]);
				return {
					...request,
					requester: requester ?? undefined,
					recipient: recipient ?? undefined,
				} as ContactRequest;
			})
		);

		return enriched;
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

		// Create bidirectional contacts
		const existingAB = await this.contactsRepository.findOne(request.requesterId, request.recipientId);
		if (!existingAB) {
			await this.contactsRepository.create(request.requesterId, request.recipientId);
		}

		const existingBA = await this.contactsRepository.findOne(request.recipientId, request.requesterId);
		if (!existingBA) {
			await this.contactsRepository.create(request.recipientId, request.requesterId);
		}

		request.status = ContactRequestStatus.ACCEPTED;
		return this.contactRequestsRepository.save(request);
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
