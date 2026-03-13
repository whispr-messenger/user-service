import {
	Injectable,
	NotFoundException,
	ConflictException,
	ForbiddenException,
	BadRequestException,
} from '@nestjs/common';
import { User } from '../../common/entities/user.entity';
import { UserRepository } from '../../common/repositories';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UploadPhotoDto } from '../dto/upload-photo.dto';
import { ChangePhoneDto } from '../dto/change-phone.dto';
import { PrivacySettingsRepository } from '../../privacy/repositories/privacy-settings.repository';
import { PrivacyLevel } from '../../privacy/entities/privacy-settings.entity';
import { ContactsRepository } from '../../contacts/repositories/contacts.repository';
import { BlockedUsersRepository } from '../../blocked-users/repositories/blocked-users.repository';

export interface PublicProfile {
	id: string;
	username: string | null;
	firstName: string | null;
	lastName: string | null;
	biography: string | null;
	profilePictureUrl: string | null;
	lastSeen: Date | null;
}

@Injectable()
export class ProfileService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly privacySettingsRepository: PrivacySettingsRepository,
		private readonly contactsRepository: ContactsRepository,
		private readonly blockedUsersRepository: BlockedUsersRepository
	) {}

	private async findOne(id: string): Promise<User> {
		const user = await this.userRepository.findById(id);

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return user;
	}

	public async getProfile(id: string): Promise<User> {
		return this.findOne(id);
	}

	public async getProfileForRequester(targetId: string, requesterId: string): Promise<PublicProfile> {
		const targetUser = await this.findOne(targetId);

		if (targetId === requesterId) {
			return this.toPublicProfile(targetUser);
		}

		const isBlocked = await this.blockedUsersRepository.isBlockedEitherWay(requesterId, targetId);
		if (isBlocked) {
			throw new ForbiddenException('Cannot view this profile');
		}

		const isContact = await this.contactsRepository.isContact(requesterId, targetId);
		const settings = await this.privacySettingsRepository.findByUserId(targetId);

		const profile: PublicProfile = {
			id: targetUser.id,
			username: targetUser.username,
			firstName: null,
			lastName: null,
			biography: null,
			profilePictureUrl: null,
			lastSeen: null,
		};

		if (!settings) {
			// Default privacy: firstName=everyone, lastName=contacts, bio=everyone, photo=everyone, lastSeen=contacts
			profile.firstName = targetUser.firstName;
			profile.biography = targetUser.biography;
			profile.profilePictureUrl = targetUser.profilePictureUrl;
			if (isContact) {
				profile.lastName = targetUser.lastName;
				profile.lastSeen = targetUser.lastSeen;
			}
			return profile;
		}

		if (this.isVisible(settings.firstNamePrivacy, isContact)) {
			profile.firstName = targetUser.firstName;
		}

		if (this.isVisible(settings.lastNamePrivacy, isContact)) {
			profile.lastName = targetUser.lastName;
		}

		if (this.isVisible(settings.biographyPrivacy, isContact)) {
			profile.biography = targetUser.biography;
		}

		if (this.isVisible(settings.profilePicturePrivacy, isContact)) {
			profile.profilePictureUrl = targetUser.profilePictureUrl;
		}

		if (this.isVisible(settings.lastSeenPrivacy, isContact)) {
			profile.lastSeen = targetUser.lastSeen;
		}

		return profile;
	}

	private isVisible(level: PrivacyLevel, isContact: boolean): boolean {
		if (level === PrivacyLevel.EVERYONE) return true;
		if (level === PrivacyLevel.CONTACTS) return isContact;
		return false;
	}

	private toPublicProfile(user: User): PublicProfile {
		return {
			id: user.id,
			username: user.username,
			firstName: user.firstName,
			lastName: user.lastName,
			biography: user.biography,
			profilePictureUrl: user.profilePictureUrl,
			lastSeen: user.lastSeen,
		};
	}

	public async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
		let user = await this.userRepository.findById(id);

		if (!user) {
			user = await this.userRepository.create({ id });
		}

		if (dto.username && dto.username !== user.username) {
			const existing = await this.userRepository.findByUsernameInsensitive(dto.username, true);
			if (existing) {
				throw new ConflictException('Username already taken');
			}
		}

		Object.assign(user, dto);

		return this.userRepository.save(user);
	}

	public async uploadPhoto(id: string, dto: UploadPhotoDto): Promise<User> {
		const user = await this.findOne(id);
		user.profilePictureUrl = dto.profilePictureUrl;
		return this.userRepository.save(user);
	}

	public async deletePhoto(id: string): Promise<User> {
		const user = await this.findOne(id);
		user.profilePictureUrl = null;
		return this.userRepository.save(user);
	}

	public async changePhoneNumber(id: string, dto: ChangePhoneDto): Promise<User> {
		const user = await this.findOne(id);

		if (user.phoneNumber === dto.phoneNumber) {
			throw new BadRequestException('New phone number is the same as current');
		}

		const existingUser = await this.userRepository.findByPhoneNumber(dto.phoneNumber);
		if (existingUser) {
			throw new ConflictException('Phone number already in use');
		}

		user.phoneNumber = dto.phoneNumber;
		return this.userRepository.save(user);
	}
}
