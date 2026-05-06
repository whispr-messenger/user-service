import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Lightweight HTTP client for the media-service.
 *
 * The media-service contract (MediaMetadataDto from Swagger):
 *   GET  /media/v1/:id       → { id, ownerId, context, contentType, blobSize, ... }
 *   GET  /media/v1/:id/blob  → { url, expiresAt } (presigned S3 URL)
 *   POST /media/v1/upload    → multipart upload (handled by mobile/frontend)
 *
 * This client calls GET /media/v1/:id to validate a mediaId before storing
 * the corresponding blob URL as the profile picture, and GET /media/v1/:id/blob
 * to get a presigned URL the browser can use directly in <img src>.
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

// WHISPR-1253: keep a short in-memory cache so we don't re-presign the same
// mediaId on every profile read. The presigned URL has a much longer TTL on
// the media-service side (hours), but a 60s window is enough to absorb a
// burst of conversations-list reads that touch the same avatars.
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
	 * Builds the legacy blob endpoint URL. Kept for backwards-compatibility
	 * with callers that still expect a path string. NEW callers serialising
	 * a profile picture for a browser client must use `presignProfilePictureUrl`
	 * instead, since this endpoint requires a JWT and `<img src>` cannot
	 * carry an Authorization header.
	 */
	resolveProfilePictureUrl(mediaId: string): string {
		return `${this.baseUrl}/media/v1/${mediaId}/blob`;
	}

	/**
	 * WHISPR-1253: Returns a presigned S3 URL the browser can use directly in
	 * `<img src>` without an Authorization header.
	 *
	 * Calls media-service GET /media/v1/:id/blob propagating the caller's JWT
	 * so the read ACL stays enforced (avatar/group_icon are public-readable
	 * but media-service still requires a valid JWT to issue a signed URL).
	 *
	 * Falls back to the bare blob endpoint URL when:
	 *   - no Authorization header is available (e.g. internal caller)
	 *   - media-service is unreachable
	 *   - media-service returns an error
	 * The fallback path keeps the previous behaviour so a media-service outage
	 * does not break the whole user-service profile responses.
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
	 * Fetch media metadata from media-service by ID.
	 *
	 * @param mediaId  UUID of the uploaded media
	 * @param userId   UUID of the requesting user (forwarded as x-user-id)
	 * @param authorization Optional Authorization header from the caller ("Bearer ...")
	 * @returns        MediaMetadata as returned by the media-service
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
		// Bound the cache size with a simple FIFO eviction. The hot set is
		// small (a single conversations list rarely shows more than a few
		// dozen avatars), so this is enough to avoid unbounded memory growth.
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
