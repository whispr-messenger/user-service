import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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

	public async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
		const user = await this.findOne(id);

		if (dto.username && dto.username !== user.username) {
			const existing = await this.userRepository.findByUsernameInsensitive(dto.username, true);
			if (existing) {
				throw new ConflictException('Username already taken');
			}
		}

		// Resolve avatarMediaId → profilePictureUrl via media-service
		if (dto.avatarMediaId) {
			if (dto.profilePictureUrl) {
				throw new BadRequestException('Cannot provide both avatarMediaId and profilePictureUrl');
			}
			const media = await this.mediaClient.getMediaMetadata(dto.avatarMediaId, id);
			if (media.context !== 'avatar') {
				throw new BadRequestException(
					`Media ${dto.avatarMediaId} is not an avatar (context=${media.context})`
				);
			}
			if (media.ownerId !== id) {
				throw new BadRequestException('Media does not belong to this user');
			}
			dto.profilePictureUrl = media.url;
		}

		// Remove avatarMediaId before saving — it's not a DB column
		const { avatarMediaId, ...fields } = dto;
		Object.assign(user, fields);

		const saved = await this.userRepository.save(user);

		if (saved.username && saved.firstName) {
			try {
				await this.searchIndexService.indexUser(saved);
			} catch (err) {
				this.logger.warn(`Failed to index user ${saved.id} in search: ${err}`);
			}
		}

		return saved;
	}
}
