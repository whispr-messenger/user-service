import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Lightweight HTTP client for the media-service.
 *
 * The media-service contract (see WHISPR-332):
 *   GET  /media/v1/:id          → { id, url, thumbnailUrl, context, mimeType, ... }
 *   POST /media/v1/upload       → multipart upload (handled by mobile/frontend)
 *
 * This client only needs to call GET /media/v1/:id to resolve a mediaId
 * into a public URL for avatar storage.
 */
export interface MediaMetadata {
	id: string;
	url: string;
	thumbnailUrl: string | null;
	context: string;
	mimeType: string;
	sizeBytes: number;
	ownerId: string;
}

@Injectable()
export class MediaClientService {
	private readonly logger = new Logger(MediaClientService.name);
	private readonly baseUrl: string;

	constructor(private readonly configService: ConfigService) {
		this.baseUrl = this.configService.get<string>('MEDIA_SERVICE_URL', 'http://media-service:3003');
	}

	/**
	 * Fetch media metadata from media-service by ID.
	 *
	 * @param mediaId  UUID of the uploaded media
	 * @param userId   UUID of the requesting user (forwarded as x-user-id)
	 * @param authorization Optional Authorization header from the caller ("Bearer ...")
	 * @returns        MediaMetadata including the public URL
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
