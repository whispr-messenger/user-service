import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Lightweight HTTP client for the media-service.
 *
 * The media-service contract (see WHISPR-332):
 *   GET  /:id                → { id, url, thumbnailUrl, context, mimeType, ... } (direct service)
 *   GET  /media/v1/:id       → same (via API gateway prefix)
 *   POST /upload             → multipart upload (handled by mobile/frontend, via gateway usually)
 *
 * This client only needs to call GET metadata to resolve a mediaId
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
		this.baseUrl = this.configService.getOrThrow<string>('MEDIA_SERVICE_URL');
	}

	/**
	 * Fetch media metadata from media-service by ID.
	 *
	 * @param mediaId  UUID of the uploaded media
	 * @param userId   UUID of the requesting user (forwarded as x-user-id)
	 * @param authorization Optional Authorization header from the caller ("Bearer ...")
	 * @returns        MediaMetadata including the public URL
	 */
	async getMediaMetadata(
		mediaId: string,
		userId: string,
		authorization?: string,
		requestBaseUrl?: string
	): Promise<MediaMetadata> {
		const base = this.baseUrl.replace(/\/+$/, '');
		const rawCandidates: string[] = [];
		const reqBase = requestBaseUrl?.trim().replace(/\/+$/, '');

		// If MEDIA_SERVICE_URL is already configured with a prefix, prefer the matching shape.
		// Examples that exist across envs:
		// - http://media-service:3003                     (service root)
		// - http://media-service:3003/media               (service global prefix)
		// - http://media-service:3003/media/v1            (versioned base)
		// - https://api.example.com/media                 (gateway prefix)
		// - https://api.example.com/media/v1              (gateway versioned base)
		if (/\/media\/v1$/i.test(base)) rawCandidates.push(`${base}/${mediaId}`);
		if (/\/media$/i.test(base)) rawCandidates.push(`${base}/v1/${mediaId}`);
		if (reqBase) {
			rawCandidates.push(`${reqBase}/media/v1/${mediaId}`);
			rawCandidates.push(`${reqBase}/media/${mediaId}`);
		}

		// General fallbacks
		rawCandidates.push(`${base}/media/v1/${mediaId}`);
		rawCandidates.push(`${base}/v1/${mediaId}`);
		rawCandidates.push(`${base}/${mediaId}`);
		rawCandidates.push(`${base}/media/${mediaId}`);

		const seen = new Set<string>();
		const candidates = rawCandidates.filter((u) => {
			if (seen.has(u)) return false;
			seen.add(u);
			return true;
		});

		const headers: Record<string, string> = {
			'x-user-id': userId,
			Accept: 'application/json',
		};
		if (authorization) {
			headers['Authorization'] = authorization;
		}

		let lastError: unknown;
		for (const url of candidates) {
			this.logger.debug(`Fetching media metadata: ${url}`);
			let res: Response;
			try {
				res = await fetch(url, {
					method: 'GET',
					headers,
					signal: AbortSignal.timeout(5_000),
				});
			} catch (err) {
				lastError = err;
				continue;
			}

			if (res.status === 404) {
				lastError = new HttpException('Media not found', HttpStatus.NOT_FOUND);
				continue;
			}

			if (!res.ok) {
				this.logger.error(`Media service returned ${res.status} for ${url}`);
				throw new HttpException('Failed to retrieve media metadata', HttpStatus.BAD_GATEWAY);
			}

			const body = (await res.json()) as MediaMetadata;
			return body;
		}

		if (lastError instanceof HttpException) {
			throw lastError;
		}
		if (lastError instanceof Error) {
			this.logger.error(`Failed to reach media-service: ${lastError.message}`);
		}
		throw new HttpException('Media service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
	}
}
