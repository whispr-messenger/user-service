import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Petit client HTTP pour le media-service.
 *
 * Contrat du media-service (MediaMetadataDto cote Swagger) :
 *   GET  /media/v1/:id       -> { id, ownerId, context, contentType, blobSize, ... }
 *   GET  /media/v1/:id/blob  -> { url, expiresAt } (URL S3 presignee)
 *   POST /media/v1/upload    -> upload multipart (gere par le mobile/frontend)
 *
 * On appelle GET /media/v1/:id pour valider un mediaId avant de stocker l'URL
 * comme photo de profil, et GET /media/v1/:id/blob pour recuperer une URL
 * presignee utilisable directement dans un <img src> cote navigateur.
 */
export interface MediaMetadata {
	id: string;
	ownerId: string;
	context: string;
	contentType: string;
	blobSize: number;
	hasThumbnail: boolean;
	isActive: boolean;
	createdAt: string;
	expiresAt: string | null;
}

interface PresignedBlobResponse {
	url: string;
	expiresAt: string | Date | null;
}

interface CachedPresignedUrl {
	url: string;
	expiresAtMs: number;
}

// WHISPR-1253 : petit cache en memoire pour ne pas re-presigner le meme mediaId
// a chaque lecture de profil. Le media-service garde l'URL presignee valide
// plusieurs heures, mais une fenetre de 60s suffit a absorber un burst de
// lectures de la liste de conversations qui tapent les memes avatars.
const PRESIGN_CACHE_TTL_MS = 60 * 1000;
const PRESIGN_CACHE_MAX_ENTRIES = 1000;

@Injectable()
export class MediaClientService {
	private readonly logger = new Logger(MediaClientService.name);
	private readonly baseUrl: string;
	private readonly presignCache = new Map<string, CachedPresignedUrl>();

	constructor(private readonly configService: ConfigService) {
		this.baseUrl = this.configService.getOrThrow<string>('MEDIA_SERVICE_URL');
	}

	getBaseUrl(): string {
		return this.baseUrl;
	}

	/**
	 * Construit l'URL legacy de l'endpoint blob. Conservee pour compat avec
	 * les appelants qui attendent encore un simple path. Les NOUVEAUX appelants
	 * qui serialisent une photo de profil pour un client navigateur doivent
	 * passer par `presignProfilePictureUrl` : cet endpoint exige un JWT et
	 * `<img src>` ne peut pas porter de header Authorization.
	 */
	resolveProfilePictureUrl(mediaId: string): string {
		return `${this.baseUrl}/media/v1/${mediaId}/blob`;
	}

	/**
	 * WHISPR-1253 : renvoie une URL S3 presignee utilisable directement dans
	 * `<img src>` sans header Authorization.
	 *
	 * Appelle media-service GET /media/v1/:id/blob en propageant le JWT de
	 * l'appelant pour que l'ACL en lecture reste appliquee (avatar/group_icon
	 * sont lisibles publiquement mais le media-service exige quand meme un
	 * JWT valide pour emettre l'URL signee).
	 *
	 * Fallback vers l'URL brute du blob si :
	 *   - pas de header Authorization (ex: appelant interne)
	 *   - media-service injoignable
	 *   - media-service renvoie une erreur
	 * Ce fallback garde l'ancien comportement pour qu'une panne media-service
	 * ne casse pas toutes les reponses profile du user-service.
	 */
	async presignProfilePictureUrl(mediaId: string, authorization?: string): Promise<string> {
		const fallback = this.resolveProfilePictureUrl(mediaId);

		if (!authorization) {
			return fallback;
		}

		const cached = this.getCached(mediaId);
		if (cached) {
			return cached;
		}

		const url = `${this.baseUrl}/media/v1/${mediaId}/blob`;
		let res: Response;
		try {
			res = await fetch(url, {
				method: 'GET',
				headers: {
					Authorization: authorization,
					Accept: 'application/json',
				},
				signal: AbortSignal.timeout(5_000),
			});
		} catch (err) {
			this.logger.warn(
				`Failed to presign avatar ${mediaId}: ${(err as Error).message} - falling back to blob endpoint`
			);
			return fallback;
		}

		if (!res.ok) {
			this.logger.warn(
				`media-service returned ${res.status} when presigning avatar ${mediaId} - falling back to blob endpoint`
			);
			return fallback;
		}

		let body: PresignedBlobResponse;
		try {
			body = (await res.json()) as PresignedBlobResponse;
		} catch (err) {
			this.logger.warn(
				`Invalid presign response for avatar ${mediaId}: ${(err as Error).message} - falling back`
			);
			return fallback;
		}

		if (!body?.url) {
			return fallback;
		}

		this.setCached(mediaId, body.url);
		return body.url;
	}

	/**
	 * Recupere les metadonnees d'un media depuis le media-service par son ID.
	 *
	 * @param mediaId  UUID du media uploade
	 * @param userId   UUID de l'utilisateur appelant (transmis en x-user-id)
	 * @param authorization Header Authorization optionnel ("Bearer ...")
	 * @returns        MediaMetadata renvoyee par le media-service
	 */
	async getMediaMetadata(mediaId: string, userId: string, authorization?: string): Promise<MediaMetadata> {
		const url = `${this.baseUrl}/media/v1/${mediaId}`;
		this.logger.debug(`Fetching media metadata: ${url}`);

		let res: Response;
		try {
			const headers: Record<string, string> = {
				'x-user-id': userId,
				Accept: 'application/json',
			};
			if (authorization) {
				headers['Authorization'] = authorization;
			}
			res = await fetch(url, {
				method: 'GET',
				headers,
				signal: AbortSignal.timeout(5_000),
			});
		} catch (err) {
			this.logger.error(`Failed to reach media-service: ${(err as Error).message}`);
			throw new HttpException('Media service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
		}

		if (res.status === 404) {
			throw new HttpException('Media not found', HttpStatus.NOT_FOUND);
		}

		if (!res.ok) {
			this.logger.error(`Media service returned ${res.status}`);
			throw new HttpException('Failed to retrieve media metadata', HttpStatus.BAD_GATEWAY);
		}

		const body = (await res.json()) as MediaMetadata;
		return body;
	}

	private getCached(mediaId: string): string | null {
		const entry = this.presignCache.get(mediaId);
		if (!entry) return null;
		if (entry.expiresAtMs <= Date.now()) {
			this.presignCache.delete(mediaId);
			return null;
		}
		return entry.url;
	}

	private setCached(mediaId: string, url: string): void {
		// Limite la taille du cache via une eviction FIFO simple. Le hot set est
		// petit (une liste de conversations affiche rarement plus de quelques
		// dizaines d'avatars), donc ca suffit a eviter de la memoire non-bornee.
		if (this.presignCache.size >= PRESIGN_CACHE_MAX_ENTRIES) {
			const firstKey = this.presignCache.keys().next().value;
			if (firstKey !== undefined) {
				this.presignCache.delete(firstKey);
			}
		}
		this.presignCache.set(mediaId, {
			url,
			expiresAtMs: Date.now() + PRESIGN_CACHE_TTL_MS,
		});
	}
}
