import {
	Injectable,
	Logger,
	NotFoundException,
	ConflictException,
	BadRequestException,
} from '@nestjs/common';
import { User, UserVisualPreferences } from '../../common/entities/user.entity';
import { UserRepository } from '../../common/repositories';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { MediaClientService } from './media-client.service';
import { SearchIndexService } from '../../cache/search-index.service';
import { CacheService } from '../../cache/cache.service';
import { PrivacyService } from '../../privacy/services/privacy.service';
import { ContactsService } from '../../contacts/services/contacts.service';
import { PrivacyLevel } from '../../privacy/entities/privacy-settings.entity';

@Injectable()
export class ProfileService {
	private readonly logger = new Logger(ProfileService.name);
	private readonly PROFILE_CACHE_PREFIX = 'profile:cache';
	private readonly PROFILE_CACHE_TTL_SECONDS = 300;

	constructor(
		private readonly userRepository: UserRepository,
		private readonly mediaClient: MediaClientService,
		private readonly searchIndexService: SearchIndexService,
		private readonly cacheService: CacheService,
		private readonly privacyService: PrivacyService,
		private readonly contactsService: ContactsService
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

	public async getProfile(id: string, authorization?: string): Promise<User> {
		const cached = await this.getCachedProfile(id);
		const user = cached ?? (await this.findOne(id));
		if (!cached) {
			await this.cacheProfile(user);
		}
		if (user.profilePictureUrl) {
			user.profilePictureUrl = await this.mediaClient.presignProfilePictureUrl(
				user.profilePictureUrl,
				authorization
			);
		}
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

	public async getProfileWithPrivacy(
		id: string,
		requesterId: string,
		authorization?: string
	): Promise<User> {
		const user = await this.findOne(id);
		return this.applyPrivacyGate(user, requesterId, authorization);
	}

	/**
	 * Recupere N profils en une seule requete DB (SELECT IN) puis applique
	 * les privacy gates par profil. Les ids inconnus / inactifs sont renvoyes
	 * dans `missing`. Pas d'erreur globale si un seul id manque, le client
	 * voit la liste partielle pour ne pas casser le rendu mobile.
	 *
	 * Le caller doit deduper les ids cote controller pour ne pas presigner
	 * deux fois la meme URL.
	 */
	public async getProfilesBatch(
		ids: string[],
		requesterId: string,
		authorization?: string
	): Promise<{ profiles: User[]; missing: string[] }> {
		if (ids.length === 0) {
			return { profiles: [], missing: [] };
		}

		const found = await this.userRepository.findByIds(ids);
		const profiles = await Promise.all(
			found.map((user) => this.applyPrivacyGate(user, requesterId, authorization))
		);
		const foundIds = new Set(found.map((u) => u.id));
		const missing = ids.filter((id) => !foundIds.has(id));
		return { profiles, missing };
	}

	private async applyPrivacyGate(user: User, requesterId: string, authorization?: string): Promise<User> {
		if (requesterId === user.id) {
			if (user.profilePictureUrl) {
				user.profilePictureUrl = await this.mediaClient.presignProfilePictureUrl(
					user.profilePictureUrl,
					authorization
				);
			}
			return user;
		}

		const settings = await this.privacyService.getSettings(user.id);
		const isContact = await this.contactsService.isContact(user.id, requesterId);

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

		// Resout avatarMediaId vers profilePictureUrl via le media-service
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

		// Enleve les champs transitoires / non-colonnes avant de sauvegarder.
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
				// WHISPR-1271 : diff en un seul pipeline. L'ancien duo
				// `indexUser(saved) + removeUserFromIndex(prev)` supprimait les cles
				// phone / user-cache / username inchange qu'on venait de reecrire.
				await this.searchIndexService.updateUserIndex(previousSnapshot as User, saved);
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
