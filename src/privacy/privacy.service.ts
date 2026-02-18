/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivacySettings, PrivacyLevel, User, Contact, BlockedUser } from '../entities';
import { UpdatePrivacySettingsDto } from '../dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class PrivacyService {
	constructor(
		@InjectRepository(PrivacySettings)
		private readonly privacySettingsRepository: Repository<PrivacySettings>,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		@InjectRepository(Contact)
		private readonly contactRepository: Repository<Contact>,
		@InjectRepository(BlockedUser)
		private readonly blockedUserRepository: Repository<BlockedUser>,
		private readonly cacheService: CacheService
	) {}

	async getPrivacySettings(userId: string): Promise<PrivacySettings> {
		const cacheKey = `privacy:${userId}`;
		const cachedSettings = await this.cacheService.get<PrivacySettings>(cacheKey);

		if (cachedSettings) {
			return cachedSettings;
		}

		const privacySettings = await this.privacySettingsRepository.findOne({
			where: { userId },
			relations: ['user'],
		});

		if (!privacySettings) {
			throw new NotFoundException('Privacy settings not found');
		}

		await this.cacheService.set(cacheKey, privacySettings, 3600); // 1 hour TTL
		return privacySettings;
	}

	async updatePrivacySettings(
		userId: string,
		updatePrivacySettingsDto: UpdatePrivacySettingsDto
	): Promise<PrivacySettings> {
		const privacySettings = await this.getPrivacySettings(userId);

		Object.assign(privacySettings, updatePrivacySettingsDto);
		const savedSettings = await this.privacySettingsRepository.save(privacySettings);

		// Invalidate cache
		await this.cacheService.del(`privacy:${userId}`);

		return savedSettings;
	}

	async canViewProfilePicture(viewerId: string, targetUserId: string): Promise<boolean> {
		return this.checkAccess(viewerId, targetUserId, (settings) => settings.profilePicturePrivacy);
	}

	async canViewFirstName(viewerId: string, targetUserId: string): Promise<boolean> {
		return this.checkAccess(viewerId, targetUserId, (settings) => settings.firstNamePrivacy);
	}

	async canViewLastName(viewerId: string, targetUserId: string): Promise<boolean> {
		return this.checkAccess(viewerId, targetUserId, (settings) => settings.lastNamePrivacy);
	}

	async canViewBiography(viewerId: string, targetUserId: string): Promise<boolean> {
		return this.checkAccess(viewerId, targetUserId, (settings) => settings.biographyPrivacy);
	}

	async canViewLastSeen(viewerId: string, targetUserId: string): Promise<boolean> {
		return this.checkAccess(viewerId, targetUserId, (settings) => settings.lastSeenPrivacy);
	}

	async canSearchByPhone(targetUserId: string): Promise<boolean> {
		const privacySettings = await this.getPrivacySettings(targetUserId);
		return privacySettings.searchByPhone;
	}

	async canSearchByUsername(targetUserId: string): Promise<boolean> {
		const privacySettings = await this.getPrivacySettings(targetUserId);
		return privacySettings.searchByUsername;
	}

	async shouldSendReadReceipts(userId: string): Promise<boolean> {
		const privacySettings = await this.getPrivacySettings(userId);
		return privacySettings.readReceipts;
	}

	async filterUserData(viewerId: string, targetUser: User): Promise<Partial<User>> {
		// 0. Self view
		if (viewerId === targetUser.id) {
			return targetUser;
		}

		// 1. Check Block
		if (await this.isBlocked(viewerId, targetUser.id)) {
			// If blocked, return minimal info or empty object
			return { id: targetUser.id };
		}

		// 2. Get Settings & Contact Status
		const [settings, isContact] = await Promise.all([
			this.getPrivacySettings(targetUser.id),
			this.areUsersContacts(viewerId, targetUser.id),
		]);

		const filteredUser: Partial<User> = {
			id: targetUser.id,
			username: targetUser.username,
			createdAt: targetUser.createdAt,
			isActive: targetUser.isActive,
		};

		// 3. Apply filters
		if (this.checkPrivacyLevelInternal(settings.profilePicturePrivacy, isContact)) {
			filteredUser.profilePictureUrl = targetUser.profilePictureUrl;
		}

		if (this.checkPrivacyLevelInternal(settings.firstNamePrivacy, isContact)) {
			filteredUser.firstName = targetUser.firstName;
		}

		if (this.checkPrivacyLevelInternal(settings.lastNamePrivacy, isContact)) {
			filteredUser.lastName = targetUser.lastName;
		}

		if (this.checkPrivacyLevelInternal(settings.biographyPrivacy, isContact)) {
			filteredUser.biography = targetUser.biography;
		}

		if (this.checkPrivacyLevelInternal(settings.lastSeenPrivacy, isContact)) {
			filteredUser.lastSeen = targetUser.lastSeen;
		}

		return filteredUser;
	}

	private async checkAccess(
		viewerId: string,
		targetUserId: string,
		getPrivacyLevel: (settings: PrivacySettings) => PrivacyLevel
	): Promise<boolean> {
		if (viewerId === targetUserId) {
			return true;
		}

		if (await this.isBlocked(viewerId, targetUserId)) {
			return false;
		}

		const settings = await this.getPrivacySettings(targetUserId);
		const level = getPrivacyLevel(settings);
		const isContact = await this.areUsersContacts(viewerId, targetUserId);

		return this.checkPrivacyLevelInternal(level, isContact);
	}

	private checkPrivacyLevelInternal(level: PrivacyLevel, isContact: boolean): boolean {
		switch (level) {
			case PrivacyLevel.EVERYONE:
				return true;
			case PrivacyLevel.CONTACTS:
				return isContact;
			case PrivacyLevel.NOBODY:
				return false;
			default:
				return false;
		}
	}

	private async isBlocked(viewerId: string, targetUserId: string): Promise<boolean> {
		const blocked = await this.blockedUserRepository.findOne({
			where: [
				{ userId: viewerId, blockedUserId: targetUserId },
				{ userId: targetUserId, blockedUserId: viewerId },
			],
		});
		return !!blocked;
	}

	private async areUsersContacts(userId1: string, userId2: string): Promise<boolean> {
		const contact = await this.contactRepository.findOne({
			where: [
				{ userId: userId1, contactId: userId2 },
				{ userId: userId2, contactId: userId1 },
			],
		});
		return !!contact;
	}
}
