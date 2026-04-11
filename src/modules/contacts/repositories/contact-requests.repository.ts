import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactRequest, ContactRequestStatus } from '../entities/contact-request.entity';

@Injectable()
export class ContactRequestsRepository {
	constructor(
		@InjectRepository(ContactRequest)
		private readonly repo: Repository<ContactRequest>,
	) {}

	async findById(id: string): Promise<ContactRequest | null> {
		return this.repo.findOne({ where: { id } });
	}

	async findByRequesterAndRecipient(
		requesterId: string,
		recipientId: string,
	): Promise<ContactRequest | null> {
		return this.repo.findOne({ where: { requesterId, recipientId } });
	}

	async findPendingBetween(
		userA: string,
		userB: string,
	): Promise<ContactRequest | null> {
		return this.repo.findOne({
			where: [
				{ requesterId: userA, recipientId: userB, status: ContactRequestStatus.PENDING },
				{ requesterId: userB, recipientId: userA, status: ContactRequestStatus.PENDING },
			],
		});
	}

	async findAllForUser(userId: string): Promise<ContactRequest[]> {
		return this.repo.find({
			where: [
				{ requesterId: userId },
				{ recipientId: userId },
			],
			order: { createdAt: 'DESC' },
		});
	}

	async create(requesterId: string, recipientId: string): Promise<ContactRequest> {
		const request = this.repo.create({
			requesterId,
			recipientId,
			status: ContactRequestStatus.PENDING,
		});
		return this.repo.save(request);
	}

	async save(request: ContactRequest): Promise<ContactRequest> {
		return this.repo.save(request);
	}

	async remove(request: ContactRequest): Promise<void> {
		await this.repo.remove(request);
	}
}
