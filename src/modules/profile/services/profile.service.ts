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

@Injectable()
export class ProfileService {
	private readonly logger = new Logger(ProfileService.name);

	constructor(
		private readonly userRepository: UserRepository,
		private readonly mediaClient: MediaClientService,
		private readonly searchIndexService: SearchIndexService
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
			user.profilePictureUrl = media.url;
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
				await this.searchIndexService.removeUserFromIndex(previousSnapshot);
			} catch (err) {
				this.logger.warn(`Failed to update search index for user ${saved.id}: ${err}`);
			}
		}

		return saved;
	}
}
