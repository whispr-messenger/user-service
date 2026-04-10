import { Injectable, Logger } from '@nestjs/common';
import { RedisConfig } from '../../../config/redis.config';
import { UserRegisteredEvent } from '../../shared/events';
import { AccountsService } from './accounts.service';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const DLQ_KEY = 'dlq:user.registered';

@Injectable()
export class UserRegisteredRetryService {
	private readonly logger = new Logger(UserRegisteredRetryService.name);

	constructor(
		private readonly accountsService: AccountsService,
		private readonly redisConfig: RedisConfig
	) {}

	async handleWithRetry(event: UserRegisteredEvent): Promise<void> {
		let lastError: Error | undefined;

		for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
			if (attempt > 0) {
				const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
				await this.sleep(delay);
				this.logger.warn(
					`Retrying user.registered for ${event.userId} (attempt ${attempt + 1}/${MAX_RETRIES})`
				);
			}

			try {
				await this.accountsService.createFromEvent(event);
				this.logger.log(
					`user.registered handled successfully for userId=${event.userId} on attempt ${attempt + 1}`
				);
				return;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				this.logger.error(
					`Attempt ${attempt + 1}/${MAX_RETRIES} failed for user.registered event ${event.userId}: ${lastError.message}`
				);
			}
		}

		await this.moveToDlq(event, lastError!);
	}

	private async moveToDlq(event: UserRegisteredEvent, error: Error): Promise<void> {
		const entry = JSON.stringify({
			event,
			error: { message: error.message, stack: error.stack },
			failedAt: new Date().toISOString(),
		});

		try {
			await this.redisConfig.getClient().rpush(DLQ_KEY, entry);
		} catch (redisError) {
			this.logger.error(`Failed to write to DLQ for user ${event.userId}:`, redisError);
		}

		this.logger.error(
			`[DLQ] user.registered event for ${event.userId} moved to dead-letter queue after ${MAX_RETRIES} failed attempts. Last error: ${error.message}`
		);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
	}
}
