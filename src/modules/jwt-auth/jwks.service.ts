import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwksRsa = require('jwks-rsa');

const BACKOFF_INITIAL_MS = 1_000;
const BACKOFF_CAP_MS = 30_000;
const BACKOFF_MAX_ATTEMPTS = 10;

@Injectable()
export class JwksService implements OnModuleInit {
	private readonly logger = new Logger(JwksService.name);
	private readonly jwksUrl: string;
	private readonly client: { getKeys(): Promise<unknown[]> };
	private _isReady = false;

	constructor(private readonly configService: ConfigService) {
		this.jwksUrl = this.configService.getOrThrow<string>('JWT_JWKS_URL');
		this.client = new jwksRsa.JwksClient({
			jwksUri: this.jwksUrl,
			cache: true,
			cacheMaxAge: 60 * 60 * 1000, // 1 hour
			rateLimit: true,
		});
	}

	get isReady(): boolean {
		return this._isReady;
	}

	onModuleInit(): void {
		void this.loadKeysWithRetry();
	}

	private async loadKeysWithRetry(): Promise<void> {
		let delay = BACKOFF_INITIAL_MS;

		for (let attempt = 1; attempt <= BACKOFF_MAX_ATTEMPTS; attempt++) {
			try {
				const keys = await this.client.getKeys();
				this._isReady = true;
				this.logger.log(`JWKS loaded: ${(keys as unknown[]).length} key(s) from ${this.jwksUrl}`);
				return;
			} catch (err) {
				this.logger.error(
					`Failed to load JWKS (attempt ${attempt}/${BACKOFF_MAX_ATTEMPTS}) from ${this.jwksUrl}: ${err}`
				);

				if (attempt < BACKOFF_MAX_ATTEMPTS) {
					this.logger.warn(`Retrying in ${delay}ms…`);
					await this.sleep(delay);
					delay = Math.min(delay * 2, BACKOFF_CAP_MS);
				}
			}
		}

		this.logger.error(
			`JWKS could not be loaded after ${BACKOFF_MAX_ATTEMPTS} attempts. Service marked as not ready.`
		);
	}

	getSecretProvider(): (
		req: unknown,
		rawJwtToken: unknown,
		done: (err: unknown, secret?: unknown) => void
	) => void {
		return jwksRsa.passportJwtSecret({
			jwksUri: this.jwksUrl,
			cache: true,
			cacheMaxAge: 60 * 60 * 1000,
			rateLimit: true,
		});
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
	}
}
