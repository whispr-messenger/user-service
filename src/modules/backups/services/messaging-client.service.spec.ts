import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { MessagingClientService } from './messaging-client.service';

const originalFetch = globalThis.fetch;

describe('MessagingClientService', () => {
	let service: MessagingClientService;
	let mockFetch: jest.Mock;

	beforeEach(async () => {
		mockFetch = jest.fn();
		globalThis.fetch = mockFetch;

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				MessagingClientService,
				{
					provide: ConfigService,
					useValue: {
						getOrThrow: jest.fn((key: string) => {
							if (key === 'MESSAGING_SERVICE_URL') return 'http://messaging-service:4000';
							throw new Error(`Missing config: ${key}`);
						}),
					},
				},
			],
		}).compile();

		service = module.get(MessagingClientService);
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	describe('restoreBackup', () => {
		const payload = { userId: 'user-1', backupId: 'backup-1', data: { foo: 'bar' } };

		it('POSTs the payload to the messaging-service restore endpoint', async () => {
			mockFetch.mockResolvedValue({ ok: true, status: 202 });

			await service.restoreBackup(payload);

			expect(mockFetch).toHaveBeenCalledWith(
				'http://messaging-service:4000/internal/v1/backups/restore',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify(payload),
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						'x-user-id': 'user-1',
					}),
				})
			);
		});

		it('throws SERVICE_UNAVAILABLE when fetch rejects', async () => {
			mockFetch.mockRejectedValue(new Error('econnrefused'));

			await expect(service.restoreBackup(payload)).rejects.toMatchObject({
				status: HttpStatus.SERVICE_UNAVAILABLE,
			});
		});

		it('throws BAD_GATEWAY when messaging-service returns a non-ok status', async () => {
			mockFetch.mockResolvedValue({ ok: false, status: 500 });

			await expect(service.restoreBackup(payload)).rejects.toBeInstanceOf(HttpException);
			await expect(service.restoreBackup(payload)).rejects.toMatchObject({
				status: HttpStatus.BAD_GATEWAY,
			});
		});
	});
});
