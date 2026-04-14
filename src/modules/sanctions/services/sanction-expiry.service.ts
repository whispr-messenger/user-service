import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SanctionsService } from './sanctions.service';

@Injectable()
export class SanctionExpiryService {
	private readonly logger = new Logger(SanctionExpiryService.name);

	constructor(private readonly sanctionsService: SanctionsService) {}

	@Cron('*/5 * * * *')
	async handleExpiry(): Promise<void> {
		this.logger.log('Running sanction expiry check...');
		try {
			const expired = await this.sanctionsService.expireSanctions();
			if (expired > 0) {
				this.logger.log(`Expired ${expired} sanction(s)`);
			}
		} catch (error) {
			this.logger.error(
				`Sanction expiry check failed: ${(error as Error).message}`,
				(error as Error).stack
			);
		}
	}
}
