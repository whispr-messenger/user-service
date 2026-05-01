import {
	Injectable,
	Logger,
	NotFoundException,
	ConflictException,
	BadRequestException,
} from '@nestjs/common';
import { User } from '../../common/entities/user.entity';
import { UserRepository } from '../../common/repositories';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { MediaClientService } from './media-client.service';
import { SearchIndexService } from '../../cache/search-index.service';
import { PrivacyService } from '../../privacy/services/privacy.service';
import { ContactsService } from '../../contacts/services/contacts.service';
import { PrivacyLevel } from '../../privacy/entities/privacy-settings.entity';

@Injectable()
export class ProfileService {
	private readonly logger = new Logger(ProfileService.name);

	constructor(
		private readonly userRepository: UserRepository,
		private readonly mediaClient: MediaClientService,
		private readonly searchIndexService: SearchIndexService,
		private readonly privacyService: PrivacyService,
		private readonly contactsService: ContactsService
	) {}

	private async findOne(id: string): Promise<User> {
		const user = await this.userRepository.findById(id);

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return user;
	}

	public async getProfile(id: string, authorization?: string): Promise<User> {
		const user = await this.findOne(id);
		if (user.profilePictureUrl) {
			user.profilePictureUrl = await this.mediaClient.presignProfilePictureUrl(
				user.profilePictureUrl,
				authorization
			);
		}
		return user;
	}

	public async getProfileWithPrivacy(
		id: string,
		requesterId: string,
		authorization?: string
	): Promise<User> {
		const user = await this.findOne(id);

		if (requesterId === id) {
			if (user.profilePictureUrl) {
				user.profilePictureUrl = await this.mediaClient.presignProfilePictureUrl(
					user.profilePictureUrl,
					authorization
				);
			}
			return user;
		}

		const settings = await this.privacyService.getSettings(id);
		const isContact = await this.contactsService.isContact(id, requesterId);

		const canSee = (level: PrivacyLevel): boolean => {
			if (level === PrivacyLevel.EVERYONE) return true;
			if (level === PrivacyLevel.CONTACTS) return isContact;
			return false;
		};

		const masked: User = { ...user } as User;
		if (!canSee(settings.firstNamePrivacy)) masked.firstName = null;
		if (!canSee(settings.lastNamePrivacy)) masked.lastName = null;
		if (!canSee(settings.biographyPrivacy)) masked.biography = null;
		if (!canSee(settings.profilePicturePrivacy)) masked.profilePictureUrl = null;
		if (!canSee(settings.lastSeenPrivacy)) masked.lastSeen = null;
		if (masked.profilePictureUrl) {
			masked.profilePictureUrl = await this.mediaClient.presignProfilePictureUrl(
				masked.profilePictureUrl,
				authorization
			);
		}
		return masked;
	}

	public async updateProfile(id: string, dto: UpdateProfileDto, authorization?: string): Promise<User> {
		const user = await this.findOne(id);
		const previousSnapshot = { ...user };

		if (dto.username && dto.username !== user.username) {
			const existing = await this.userRepository.findByUsernameInsensitive(dto.username, true);
			if (existing) {
				throw new ConflictException('Username already taken');
			}
		}

		// Resolve avatarMediaId → profilePictureUrl via media-service
		if (dto.avatarMediaId) {
			const media = await this.mediaClient.getMediaMetadata(dto.avatarMediaId, id, authorization);
			if (media.context !== 'avatar') {
				throw new BadRequestException(
					`Media ${dto.avatarMediaId} is not an avatar (context=${media.context})`
				);
			}
			if (media.ownerId !== id) {
				throw new BadRequestException('Media does not belong to this user');
			}
			user.profilePictureUrl = dto.avatarMediaId;
		}

		// Remove avatarMediaId before saving — it's not a DB column
		const { avatarMediaId, ...fields } = dto;
		Object.assign(user, fields);

		const saved = await this.userRepository.save(user);

		if (
			saved.username !== previousSnapshot.username ||
			saved.firstName !== previousSnapshot.firstName ||
			saved.lastName !== previousSnapshot.lastName
		) {
			try {
				// Index new data first, then remove old entries — if indexUser fails,
				// the user remains discoverable under the old keys instead of vanishing.
				await this.searchIndexService.indexUser(saved);
				await this.searchIndexService.removeUserFromIndex(previousSnapshot as User);
			} catch (err) {
				this.logger.warn(`Failed to update search index for user ${saved.id}: ${err}`);
			}
		}

		if (saved.profilePictureUrl) {
			saved.profilePictureUrl = await this.mediaClient.presignProfilePictureUrl(
				saved.profilePictureUrl,
				authorization
			);
		}
		return saved;
	}
}
