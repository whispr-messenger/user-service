import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Lightweight HTTP client for the media-service.
 *
 * The media-service contract (MediaMetadataDto from Swagger):
 *   GET  /media/v1/:id       → { id, ownerId, context, contentType, blobSize, ... }
 *   POST /media/v1/upload    → multipart upload (handled by mobile/frontend)
 *
 * This client calls GET /media/v1/:id to validate a mediaId
 * before storing the corresponding blob URL as the profile picture.
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

@Injectable()
export class MediaClientService {
	private readonly logger = new Logger(MediaClientService.name);
	private readonly baseUrl: string;

	constructor(private readonly configService: ConfigService) {
		this.baseUrl = this.configService.getOrThrow<string>('MEDIA_SERVICE_URL');
	}

	getBaseUrl(): string {
		return this.baseUrl;
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
}
