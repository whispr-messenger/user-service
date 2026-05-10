import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RolesRepository } from '../repositories/roles.repository';

/**
 * Bootstraps admin roles from the SEED_ADMIN_USER_IDS environment variable.
 *
 * Value is a comma-separated list of UUIDs. Each UUID is upserted with role
 * 'admin' on module init (idempotent). If the env var is unset or empty,
 * the service is a no-op — safe for production.
 *
 * Solves the chicken-and-egg problem for bootstrapping the first admin(s)
 * without direct SQL or hardcoded migrations.
 */
@Injectable()
export class SeedAdminService implements OnModuleInit {
	private readonly logger = new Logger(SeedAdminService.name);

	constructor(
		private readonly rolesRepository: RolesRepository,
		private readonly configService: ConfigService
	) {}

	async onModuleInit(): Promise<void> {
		const raw = this.configService.get<string>('SEED_ADMIN_USER_IDS', '');
		const ids = raw
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		if (ids.length === 0) {
			return;
		}

		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		const valid: string[] = [];
		for (const id of ids) {
			if (uuidRegex.test(id)) {
				valid.push(id);
			} else {
				this.logger.warn(`Ignoring invalid UUID in SEED_ADMIN_USER_IDS: ${id}`);
			}
		}

		for (const userId of valid) {
			try {
				await this.rolesRepository.upsert(userId, 'admin', userId);
				this.logger.log(`Seeded admin role for user ${userId}`);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				this.logger.error(`Failed to seed admin role for user ${userId}: ${msg}`);
			}
		}
	}
}
