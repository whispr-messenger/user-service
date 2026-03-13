import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import JwksRsa from 'jwks-rsa';

@Injectable()
export class JwksService implements OnModuleInit {
	private readonly logger = new Logger(JwksService.name);
	private readonly jwksUrl: string;
	private readonly client: JwksRsa.JwksClient;

	constructor(private readonly configService: ConfigService) {
		this.jwksUrl = this.configService.getOrThrow<string>('JWT_JWKS_URL');
		this.client = new JwksRsa.JwksClient({
			jwksUri: this.jwksUrl,
			cache: true,
			cacheMaxAge: 60 * 60 * 1000, // 1 hour
			rateLimit: true,
		});
	}

	async onModuleInit(): Promise<void> {
		try {
			const keys = await this.client.getKeys();
			this.logger.log(`JWKS loaded: ${(keys as unknown[]).length} key(s) from ${this.jwksUrl}`);
		} catch (err) {
			this.logger.error(`Failed to load JWKS at startup from ${this.jwksUrl}: ${err}`);
		}
	}

	getSecretProvider(): JwksRsa.SecretCallbackLong {
		return JwksRsa.passportJwtSecret({
			jwksUri: this.jwksUrl,
			cache: true,
			cacheMaxAge: 60 * 60 * 1000,
			rateLimit: true,
		});
	}
}
