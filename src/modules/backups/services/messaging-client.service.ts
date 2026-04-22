import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Lightweight HTTP client for the messaging-service.
 *
 * Backup restore contract (see WHISPR-1108, follow-up of WHISPR-1048):
 *   POST /internal/v1/backups/restore
 *     body: { userId: string, backupId: string, data: Record<string, unknown> }
 *     → 202 Accepted when the restore job is queued
 *
 * The messaging-service re-materialises the user's messages/conversations
 * from the JSON payload stored in user-service. This client only fires the
 * request and surfaces transport failures; reconciliation is async on the
 * messaging-service side.
 */
export interface RestoreBackupPayload {
	userId: string;
	backupId: string;
	data: Record<string, unknown>;
}

@Injectable()
export class MessagingClientService {
	private readonly logger = new Logger(MessagingClientService.name);
	private readonly baseUrl: string;

	constructor(private readonly configService: ConfigService) {
		this.baseUrl = this.configService.getOrThrow<string>('MESSAGING_SERVICE_URL');
	}

	async restoreBackup(payload: RestoreBackupPayload): Promise<void> {
		const url = `${this.baseUrl}/internal/v1/backups/restore`;
		this.logger.debug(`Restoring backup ${payload.backupId} for user ${payload.userId}`);

		let res: Response;
		try {
			res = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-user-id': payload.userId,
					Accept: 'application/json',
				},
				body: JSON.stringify(payload),
				signal: AbortSignal.timeout(10_000),
			});
		} catch (err) {
			this.logger.error(`Failed to reach messaging-service: ${(err as Error).message}`);
			throw new HttpException('Messaging service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
		}

		if (!res.ok) {
			this.logger.error(`Messaging service returned ${res.status} when restoring backup`);
			throw new HttpException('Failed to restore backup on messaging service', HttpStatus.BAD_GATEWAY);
		}
	}
}
