import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactRequest, ContactRequestStatus } from '../entities/contact-request.entity';
import { CursorPaginatedResult } from '../../common/dto/cursor-pagination.dto';
import { applyCursorPagination } from '../../common/utils/cursor-pagination.util';

@Injectable()
export class ContactRequestsRepository {
	constructor(
		@InjectRepository(ContactRequest)
		private readonly repo: Repository<ContactRequest>
	) {}

	async findById(id: string): Promise<ContactRequest | null> {
		return this.repo.findOne({ where: { id } });
	}

	async findPendingBetween(userA: string, userB: string): Promise<ContactRequest | null> {
		return this.repo.findOne({
			where: [
				{ requesterId: userA, recipientId: userB, status: ContactRequestStatus.PENDING },
				{ requesterId: userB, recipientId: userA, status: ContactRequestStatus.PENDING },
			],
		});
	}

	async findAllForUser(userId: string): Promise<ContactRequest[]> {
		return this.repo.find({
			where: [{ requesterId: userId }, { recipientId: userId }],
			relations: ['requester', 'recipient'],
			order: { createdAt: 'DESC' },
		});
	}

	async findAllForUserPaginated(
		userId: string,
		limit: number = 50,
		cursor?: string
	): Promise<CursorPaginatedResult<ContactRequest>> {
		const qb = this.repo
			.createQueryBuilder('request')
			.leftJoinAndSelect('request.requester', 'requester')
			.leftJoinAndSelect('request.recipient', 'recipient')
			.where('(request.requesterId = :userId OR request.recipientId = :userId)', { userId });

		return applyCursorPagination(qb, {
			alias: 'request',
			limit,
			cursor,
			direction: 'DESC',
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
