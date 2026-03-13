import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { User } from '../../common/entities/user.entity';
import { UserRegisteredEvent } from '../../shared/events';
import { UserRepository } from '../../common/repositories';
import { UserCreatedEvent, UserDeactivatedEvent } from '../events';

/**
 * AccountsService - Manages core user identity and lifecycle
 *
 * Responsibilities:
 * - User account creation from authentication events
 * - Activity tracking (last seen)
 * - Account status (activation, deactivation)
 * - Account deletion
 */
@Injectable()
export class AccountsService {
	constructor(
		private readonly userRepository: UserRepository,
		@Inject('EVENTS_SERVICE')
		private readonly eventsClient: ClientProxy
	) {}

	private async findOne(id: string): Promise<User> {
		const user = await this.userRepository.findById(id, ['privacySettings']);

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return user;
	}

	/**
	 * Create a minimal user record from event
	 * Used when receiving user.registered event from auth module
	 * Only creates the record with id and phoneNumber, other fields can be filled later
	 *
	 * NOTE: Search index is NOT created at this stage.
	 * User becomes searchable only after ProfileService.completeProfile() is called.
	 */
	public async createFromEvent(event: UserRegisteredEvent): Promise<User> {
		const existingUser = await this.userRepository.findById(event.userId);

		if (existingUser) {
			return existingUser;
		}

		const userWithPhone = await this.userRepository.findByPhoneNumber(event.phoneNumber);

		if (userWithPhone) {
			throw new ConflictException('Phone number already exists with different user ID');
		}

		const user = await this.userRepository.create({
			id: event.userId,
			phoneNumber: event.phoneNumber,
			isActive: true,
		});

		// Publish user.created event for projections
		this.eventsClient.emit(
			'user.created',
			new UserCreatedEvent(
				user.id,
				user.phoneNumber,
				user.username || event.phoneNumber, // fallback to phoneNumber if username not set
				user.firstName || '',
				user.lastName
			)
		);

		return user;
	}

	public async updateLastSeen(id: string): Promise<void> {
		await this.userRepository.updateLastSeen(id);
	}

	public async deactivate(id: string): Promise<void> {
		await this.findOne(id);
		await this.userRepository.updateStatus(id, false);

		this.eventsClient.emit('user.deactivated', new UserDeactivatedEvent(id, new Date()));
	}

	public async activate(id: string): Promise<void> {
		await this.findOne(id);
		await this.userRepository.updateStatus(id, true);
	}

	public async remove(id: string): Promise<void> {
		await this.findOne(id);
		await this.userRepository.softDelete(id);
	}
}
