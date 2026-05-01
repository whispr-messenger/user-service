import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { MediaClientService } from './media-client.service';

// Store original fetch
const originalFetch = globalThis.fetch;

describe('MediaClientService', () => {
	let service: MediaClientService;
	let mockFetch: jest.Mock;

	beforeEach(async () => {
		mockFetch = jest.fn();
		globalThis.fetch = mockFetch;

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				MediaClientService,
				{
					provide: ConfigService,
					useValue: {
						getOrThrow: jest.fn((key: string) => {
							if (key === 'MEDIA_SERVICE_URL') return 'http://media-service:3000';
							throw new Error(`Missing config: ${key}`);
						}),
					},
				},
			],
		}).compile();

		service = module.get<MediaClientService>(MediaClientService);
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	describe('resolveProfilePictureUrl', () => {
		it('constructs the blob URL from a mediaId', () => {
			const url = service.resolveProfilePictureUrl('media-uuid-1');
			expect(url).toBe('http://media-service:3000/media/v1/media-uuid-1/blob');
		});
	});

	describe('presignProfilePictureUrl', () => {
		it('returns the presigned URL from media-service when Authorization is provided', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					url: 'https://minio.example/avatars/media-1?X-Amz-Signature=abc',
					expiresAt: '2026-05-01T00:00:00Z',
				}),
			});

			const url = await service.presignProfilePictureUrl('media-1', 'Bearer token-xyz');

			expect(url).toBe('https://minio.example/avatars/media-1?X-Amz-Signature=abc');
			expect(mockFetch).toHaveBeenCalledWith(
				'http://media-service:3000/media/v1/media-1/blob',
				expect.objectContaining({
					method: 'GET',
					headers: expect.objectContaining({
						Authorization: 'Bearer token-xyz',
					}),
				})
			);
		});

		it('falls back to the blob endpoint URL when no Authorization is provided', async () => {
			const url = await service.presignProfilePictureUrl('media-1');

			expect(url).toBe('http://media-service:3000/media/v1/media-1/blob');
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('falls back to the blob endpoint URL when media-service is unreachable', async () => {
			mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

			const url = await service.presignProfilePictureUrl('media-1', 'Bearer token-xyz');

			expect(url).toBe('http://media-service:3000/media/v1/media-1/blob');
		});

		it('falls back to the blob endpoint URL on a non-2xx response', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
			});

			const url = await service.presignProfilePictureUrl('media-1', 'Bearer token-xyz');

			expect(url).toBe('http://media-service:3000/media/v1/media-1/blob');
		});

		it('caches the presigned URL across calls within the TTL window', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					url: 'https://minio.example/avatars/cached?sig=1',
					expiresAt: null,
				}),
			});

			const first = await service.presignProfilePictureUrl('cached', 'Bearer t');
			const second = await service.presignProfilePictureUrl('cached', 'Bearer t');

			expect(first).toBe('https://minio.example/avatars/cached?sig=1');
			expect(second).toBe(first);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('falls back when the response body has no url field', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ expiresAt: null }),
			});

			const url = await service.presignProfilePictureUrl('media-1', 'Bearer t');

			expect(url).toBe('http://media-service:3000/media/v1/media-1/blob');
		});
	});

	describe('getMediaMetadata', () => {
		const validBody = {
			id: 'media-1',
			ownerId: 'user-1',
			context: 'avatar',
			contentType: 'image/webp',
			blobSize: 1024,
			hasThumbnail: false,
			isActive: true,
			createdAt: '2026-04-01T00:00:00Z',
			expiresAt: null,
		};

		it('returns metadata on success', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => validBody,
			});

			const result = await service.getMediaMetadata('media-1', 'user-1');

			expect(result).toEqual(validBody);
			expect(mockFetch).toHaveBeenCalledWith(
				'http://media-service:3000/media/v1/media-1',
				expect.objectContaining({
					method: 'GET',
					headers: { 'x-user-id': 'user-1', Accept: 'application/json' },
				})
			);
		});

		it('throws HttpException NOT_FOUND when media-service returns 404', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
			});

			await expect(service.getMediaMetadata('bad-id', 'user-1')).rejects.toThrow(HttpException);

			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
			});

			await expect(service.getMediaMetadata('bad-id', 'user-1')).rejects.toMatchObject({
				status: HttpStatus.NOT_FOUND,
			});
		});

		it('throws HttpException BAD_GATEWAY on non-404 error', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
			});

			await expect(service.getMediaMetadata('media-1', 'user-1')).rejects.toMatchObject({
				status: HttpStatus.BAD_GATEWAY,
			});
		});

		it('throws HttpException SERVICE_UNAVAILABLE on network error', async () => {
			mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

			await expect(service.getMediaMetadata('media-1', 'user-1')).rejects.toMatchObject({
				status: HttpStatus.SERVICE_UNAVAILABLE,
			});
		});
	});
});
