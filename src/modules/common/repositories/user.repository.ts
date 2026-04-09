import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { User } from '../entities/user.entity';

/**
 * Repository pattern for User entity
 * Encapsulates all data access logic for User
 * Prevents direct access to TypeORM repository from other modules
 */
@Injectable()
export class UserRepository {
	constructor(
		@InjectRepository(User)
		private readonly repository: Repository<User>
	) {}

	/**
	 * Create a new user
	 */
	async create(userData: Partial<User>): Promise<User> {
		const user = this.repository.create(userData);
		return this.repository.save(user);
	}

	/**
	 * Save or update a user
	 */
	async save(user: User): Promise<User> {
		return this.repository.save(user);
	}

	/**
	 * Find a user by ID
	 */
	async findById(id: string, relations?: string[]): Promise<User | null> {
		return this.repository.findOne({
			where: { id },
			relations,
		});
	}

	/**
	 * Find a user by phone number
	 */
	async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
		return this.repository.findOne({
			where: { phoneNumber },
		});
	}

	/**
	 * Find a user by phone number with activity filter
	 */
	async findByPhoneNumberWithFilter(
		phoneNumber: string,
		includeInactive: boolean = false,
		relations?: string[]
	): Promise<User | null> {
		return this.repository.findOne({
			where: {
				phoneNumber,
				...(includeInactive ? {} : { isActive: true }),
			},
			relations,
		});
	}

	/**
	 * Find a user by username
	 */
	async findByUsername(username: string): Promise<User | null> {
		return this.repository.findOne({
			where: { username },
		});
	}

	/**
	 * Find a user by username with case-insensitive search
	 */
	async findByUsernameInsensitive(
		username: string,
		includeInactive: boolean = false,
		relations?: string[]
	): Promise<User | null> {
		return this.repository.findOne({
			where: {
				username: ILike(username),
				...(includeInactive ? {} : { isActive: true }),
			},
			relations,
		});
	}

	/**
	 * Find one user by criteria
	 */
	async findOne(where: FindOptionsWhere<User>, relations?: string[]): Promise<User | null> {
		return this.repository.findOne({
			where,
			relations,
		});
	}

	/**
	 * Find all users with pagination
	 */
	async findAll(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> {
		const [users, total] = await this.repository.findAndCount({
			relations: ['privacySettings'],
			skip: (page - 1) * limit,
			take: limit,
			order: { createdAt: 'DESC' },
		});

		return { users, total };
	}

	/**
	 * Find all users (for batch operations)
	 */
	async findAllUsers(): Promise<User[]> {
		return this.repository.find();
	}

	/**
	 * Update user's last seen timestamp
	 */
	async updateLastSeen(id: string, lastSeen: Date = new Date()): Promise<void> {
		await this.repository.update(id, { lastSeen });
	}

	/**
	 * Soft delete a user
	 */
	async softDelete(id: string): Promise<void> {
		await this.repository.softDelete(id);
	}

	/**
	 * Update user status (active/inactive)
	 */
	async updateStatus(id: string, isActive: boolean): Promise<void> {
		await this.repository.update(id, { isActive });
	}
}
