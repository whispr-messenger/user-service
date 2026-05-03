import {
	Injectable,
	Logger,
	NotFoundException,
	ConflictException,
	BadRequestException,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import { User } from '../../common/entities/user.entity';
import { UserRepository } from '../../common/repositories';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { MediaClientService } from './media-client.service';
import { SearchIndexService } from '../../cache/search-index.service';
import { CacheService } from '../../cache/cache.service';
import { UserVisualPreferences } from '../../common/entities/user.entity';

@Injectable()
export class ProfileService {
	private readonly logger = new Logger(ProfileService.name);
	private readonly PROFILE_CACHE_PREFIX = 'profile:cache';
	private readonly PROFILE_CACHE_TTL_SECONDS = 300;

	constructor(
		private readonly userRepository: UserRepository,
		private readonly mediaClient: MediaClientService,
		private readonly searchIndexService: SearchIndexService,
		private readonly cacheService: CacheService
	) {}

	private getProfileCacheKey(id: string): string {
		return `${this.PROFILE_CACHE_PREFIX}:${id}`;
	}

	private async getCachedProfile(id: string): Promise<User | null> {
		try {
			return await this.cacheService.get<User>(this.getProfileCacheKey(id));
		} catch (error) {
			this.logger.warn(`Failed to read cached profile ${id}: ${error}`);
			return null;
		}
	}

	private async cacheProfile(user: User): Promise<void> {
		try {
			await this.cacheService.pipeline([
				[
					'setex',
					this.getProfileCacheKey(user.id),
					this.PROFILE_CACHE_TTL_SECONDS,
					JSON.stringify(user),
				],
			]);
		} catch (error) {
			this.logger.warn(`Failed to warm profile cache for user ${user.id}: ${error}`);
		}
	}

	private async invalidateProfileCache(userId: string): Promise<void> {
		try {
			await this.cacheService.delMany([this.getProfileCacheKey(userId)]);
		} catch (error) {
			this.logger.warn(`Failed to invalidate profile cache for user ${userId}: ${error}`);
		}
	}

	private async findOne(id: string): Promise<User> {
		const user = await this.userRepository.findById(id);

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return user;
	}

	public async getProfile(id: string): Promise<User> {
		const cached = await this.getCachedProfile(id);
		if (cached) {
			return cached;
		}

		const user = await this.findOne(id);
		await this.cacheProfile(user);
		return user;
	}

	private mergeVisualPreferences(
		current: UserVisualPreferences | null | undefined,
		next: UpdateProfileDto['visualPreferences'],
		legacyBackground?: {
			backgroundMediaId?: string | null;
			backgroundMediaUrl?: string | null;
		}
	): UserVisualPreferences | null {
		const base: UserVisualPreferences = current ? { ...current } : {};
		let changed = false;

		if (next) {
			for (const [key, value] of Object.entries(next)) {
				(base as Record<string, unknown>)[key] = value ?? null;
				changed = true;
			}
		}

		if (legacyBackground && 'backgroundMediaId' in legacyBackground) {
			base.backgroundMediaId = legacyBackground.backgroundMediaId ?? null;
			changed = true;
		}

		if (legacyBackground && 'backgroundMediaUrl' in legacyBackground) {
			base.backgroundMediaUrl = legacyBackground.backgroundMediaUrl ?? null;
			changed = true;
		}

		if (!changed) {
			return current ?? null;
		}

		if (
			base.backgroundPreset !== 'custom' &&
			(base.backgroundMediaId !== undefined || base.backgroundMediaUrl !== undefined)
		) {
			base.backgroundMediaId = null;
			base.backgroundMediaUrl = null;
		}

		if (!base.updatedAt) {
			base.updatedAt = new Date().toISOString();
		}

		return base;
	}

	public async updateProfile(
		id: string,
		dto: UpdateProfileDto,
		authorization?: string,
		requestBaseUrl?: string
	): Promise<User> {
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
			try {
				const media = await this.mediaClient.getMediaMetadata(
					dto.avatarMediaId,
					id,
					authorization,
					requestBaseUrl
				);
				if (media.context !== 'avatar') {
					throw new BadRequestException(
						`Media ${dto.avatarMediaId} is not an avatar (context=${media.context})`
					);
				}
				if (media.ownerId !== id) {
					throw new BadRequestException('Media does not belong to this user');
				}
				user.profilePictureUrl = media.url;
			} catch (err) {
				const status = err instanceof HttpException ? err.getStatus() : (err as any)?.status;
				if (status === HttpStatus.NOT_FOUND && requestBaseUrl) {
					const base = requestBaseUrl.replace(/\/+$/, '');
					user.profilePictureUrl = `${base}/media/v1/${dto.avatarMediaId}/blob`;
				} else {
					throw err;
				}
			}
		}

		const mergedVisualPreferences = this.mergeVisualPreferences(
			user.visualPreferences,
			dto.visualPreferences,
			'backgroundMediaId' in dto || 'backgroundMediaUrl' in dto
				? {
						backgroundMediaId: dto.backgroundMediaId ?? null,
						backgroundMediaUrl: dto.backgroundMediaUrl ?? null,
					}
				: undefined
		);

		if (mergedVisualPreferences !== user.visualPreferences) {
			user.visualPreferences = mergedVisualPreferences;
		}

		// Remove transient/non-column fields before saving.
		const { avatarMediaId, visualPreferences, backgroundMediaId, backgroundMediaUrl, ...fields } = dto;
		Object.assign(user, fields);

		const saved = await this.userRepository.save(user);
		await this.invalidateProfileCache(saved.id);
		await this.cacheProfile(saved);

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

		return saved;
	}
}
