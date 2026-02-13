import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, PrivacySettings, UserSearchIndex, Contact, BlockedUser } from '../entities';
import { CreateUserDto, UpdateUserDto } from '../dto';
import { CacheService } from '../cache/cache.service';
import { PrivacyService } from '../privacy/privacy.service';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		@InjectRepository(PrivacySettings)
		private readonly privacySettingsRepository: Repository<PrivacySettings>,
		@InjectRepository(UserSearchIndex)
		private readonly userSearchIndexRepository: Repository<UserSearchIndex>,
		@InjectRepository(Contact)
		private readonly contactRepository: Repository<Contact>,
		@InjectRepository(BlockedUser)
		private readonly blockedUserRepository: Repository<BlockedUser>,
		private readonly cacheService: CacheService,
		private readonly privacyService: PrivacyService
	) {}

	async create(createUserDto: CreateUserDto): Promise<User> {
		// Vérifier si le numéro de téléphone existe déjà
		const existingUserByPhone = await this.userRepository.findOne({
			where: { phoneNumber: createUserDto.phoneNumber },
		});
		if (existingUserByPhone) {
			throw new ConflictException('Phone number already exists');
		}

		// Vérifier si le nom d'utilisateur existe déjà
		const existingUserByUsername = await this.userRepository.findOne({
			where: { username: createUserDto.username },
		});
		if (existingUserByUsername) {
			throw new ConflictException('Username already exists');
		}

		const queryRunner = this.userRepository.manager.connection.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Créer l'utilisateur
			const user = this.userRepository.create(createUserDto);
			const savedUser = await queryRunner.manager.save(user);

			// Créer les paramètres de confidentialité par défaut
			const privacySettings = this.privacySettingsRepository.create({
				userId: savedUser.id,
			});
			await queryRunner.manager.save(privacySettings);

			// Créer l'index de recherche
			const searchIndex = this.userSearchIndexRepository.create({
				userId: savedUser.id,
				phoneNumberHash: this.hashPhoneNumber(createUserDto.phoneNumber),
				usernameNormalized: createUserDto.username.toLowerCase(),
				firstNameNormalized: createUserDto.firstName.toLowerCase(),
				lastNameNormalized: createUserDto.lastName?.toLowerCase() || null,
			});
			await queryRunner.manager.save(searchIndex);

			await queryRunner.commitTransaction();
			return savedUser;
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}

	async findAll(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> {
		const [users, total] = await this.userRepository.findAndCount({
			relations: ['privacySettings'],
			skip: (page - 1) * limit,
			take: limit,
			order: { createdAt: 'DESC' },
		});

		return { users, total };
	}

	async findOne(id: string): Promise<User> {
		const cachedUser = await this.cacheService.get<User>(`user:${id}`);
		if (cachedUser) {
			return this.userRepository.create(cachedUser);
		}

		const user = await this.userRepository.findOne({
			where: { id },
			relations: ['privacySettings'],
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		await this.cacheService.set(`user:${id}`, user, 3600);
		return user;
	}

	async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
		return this.userRepository.findOne({
			where: { phoneNumber },
			relations: ['privacySettings'],
		});
	}

	async findByUsername(username: string): Promise<User | null> {
		return this.userRepository.findOne({
			where: { username },
			relations: ['privacySettings'],
		});
	}

	async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
		const user = await this.findOne(id);
		await this.ensureUsernameNotTaken(updateUserDto, user);

		const queryRunner = this.userRepository.manager.connection.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Mettre à jour l'utilisateur
			Object.assign(user, updateUserDto);
			const updatedUser = await queryRunner.manager.save(user);

			// Invalidate cache
			await this.cacheService.del(`user:${id}`);
			const profileKeys = await this.cacheService.keys(`profile:${id}:*`);
			if (profileKeys.length > 0) {
				await this.cacheService.delMany(profileKeys);
			}

			// Mettre à jour l'index de recherche si nécessaire
			if (updateUserDto.username || updateUserDto.firstName || updateUserDto.lastName) {
				const searchIndex = await queryRunner.manager.findOne(UserSearchIndex, {
					where: { userId: id },
				});

				if (searchIndex) {
					if (updateUserDto.username) {
						searchIndex.usernameNormalized = updateUserDto.username.toLowerCase();
					}
					if (updateUserDto.firstName) {
						searchIndex.firstNameNormalized = updateUserDto.firstName.toLowerCase();
					}
					if (updateUserDto.lastName !== undefined) {
						searchIndex.lastNameNormalized = updateUserDto.lastName?.toLowerCase() || null;
					}
					await queryRunner.manager.save(searchIndex);
				}
			}

			await queryRunner.commitTransaction();
			return updatedUser;
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}

	private async ensureUsernameNotTaken(updateUserDto: UpdateUserDto, user: User): Promise<void> {
		if (updateUserDto.username && updateUserDto.username !== user.username) {
			const existingUser = await this.userRepository.findOne({
				where: { username: updateUserDto.username },
			});
			if (existingUser) {
				throw new ConflictException('Username already exists');
			}
		}
	}

	async updateLastSeen(id: string): Promise<void> {
		await this.userRepository.update(id, { lastSeen: new Date() });
	}

	async deactivate(id: string): Promise<void> {
		await this.findOne(id);
		await this.userRepository.update(id, { isActive: false });
	}

	async activate(id: string): Promise<void> {
		await this.findOne(id);
		await this.userRepository.update(id, { isActive: true });
	}

	async remove(id: string): Promise<void> {
		await this.findOne(id);
		await this.userRepository.softDelete(id);
		await this.cacheService.del(`user:${id}`);
	}

	async getMe(id: string): Promise<User> {
		return this.findOne(id);
	}

	async getProfile(targetUserId: string, requesterUserId: string): Promise<Partial<User>> {
		const cacheKey = `profile:${targetUserId}:${requesterUserId}`;
		const cachedProfile = await this.cacheService.get<Partial<User>>(cacheKey);

		if (cachedProfile) {
			return cachedProfile;
		}

		// Get user (findOne already handles user caching and not found exception)
		const user = await this.findOne(targetUserId);

		// Use PrivacyService to filter data
		const profile = await this.privacyService.filterUserData(requesterUserId, user);

		await this.cacheService.set(cacheKey, profile, 3600); // 1 hour TTL
		return profile;
	}

	async searchUsers(
		query: string,
		requesterUserId: string,
		page: number = 1,
		limit: number = 20
	): Promise<{ users: Partial<User>[]; total: number }> {
		const normalizedQuery = query.toLowerCase();
		const phoneHash = this.hashPhoneNumber(query);

		const qb = this.userSearchIndexRepository.createQueryBuilder('index').select('index.userId');

		qb.where('index.usernameNormalized LIKE :likeQuery', { likeQuery: `%${normalizedQuery}%` })
			.orWhere('index.firstNameNormalized LIKE :likeQuery', { likeQuery: `%${normalizedQuery}%` })
			.orWhere('index.lastNameNormalized LIKE :likeQuery', { likeQuery: `%${normalizedQuery}%` })
			.orWhere('index.phoneNumberHash = :phoneHash', { phoneHash });

		const [indices, total] = await qb
			.skip((page - 1) * limit)
			.take(limit)
			.getManyAndCount();

		if (indices.length === 0) {
			return { users: [], total: 0 };
		}

		const userIds = indices.map((i) => i.userId);

		const users = await this.userRepository.find({
			where: { id: In(userIds) },
			relations: ['privacySettings'],
		});

		// Filter results based on privacy
		const filteredUsers: Partial<User>[] = [];
		for (const user of users) {
			const profile = await this.privacyService.filterUserData(requesterUserId, user);
			// Only include if at least username is visible (i.e. not blocked)
			if (profile.username) {
				filteredUsers.push(profile);
			}
		}

		return { users: filteredUsers, total };
	}

	private hashPhoneNumber(phoneNumber: string): string {
		return crypto.createHash('sha256').update(phoneNumber).digest('hex');
	}
}
