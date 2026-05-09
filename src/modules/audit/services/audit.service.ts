import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { AuditRepository, AuditQueryOptions } from '../repositories/audit.repository';
import { RolesService } from '../../roles/services/roles.service';
import { AuditLog } from '../entities/audit-log.entity';

const CSV_HEADER = 'id,actor_id,action,target_type,target_id,metadata,created_at';
// taille de page pour streamer l export CSV sans tout charger en memoire (WHISPR-1382)
const EXPORT_PAGE_SIZE = 1000;

export interface CsvExportResult {
	stream: Readable;
	totalRows: () => number;
}

@Injectable()
export class AuditService {
	constructor(
		private readonly auditRepository: AuditRepository,
		private readonly rolesService: RolesService
	) {}

	async log(
		actorId: string,
		action: string,
		targetType: string,
		targetId: string,
		metadata?: Record<string, any>
	): Promise<AuditLog> {
		return this.auditRepository.create({
			actorId,
			action,
			targetType,
			targetId,
			metadata: metadata || {},
		});
	}

	async list(adminId: string, query: AuditQueryOptions): Promise<{ data: AuditLog[]; total: number }> {
		await this.rolesService.ensureAdminOrModerator(adminId);

		const [data, total] = await Promise.all([
			this.auditRepository.findAll(query),
			this.auditRepository.countAll({
				actorId: query.actorId,
				targetType: query.targetType,
				action: query.action,
				dateFrom: query.dateFrom,
				dateTo: query.dateTo,
			}),
		]);

		return { data, total };
	}

	// streame l export par pages pour eviter la troncature silencieuse a 1000 lignes (WHISPR-1382)
	async exportCsv(adminId: string): Promise<CsvExportResult> {
		await this.rolesService.ensureAdminOrModerator(adminId);

		let totalRows = 0;
		const repo = this.auditRepository;

		const stream = new Readable({
			read() {},
		});

		(async () => {
			try {
				stream.push(CSV_HEADER);
				let offset = 0;
				while (true) {
					const page = await repo.findAll({ limit: EXPORT_PAGE_SIZE, offset });
					if (page.length === 0) break;
					for (const log of page) {
						stream.push('\n' + serialiseRow(log));
					}
					totalRows += page.length;
					if (page.length < EXPORT_PAGE_SIZE) break;
					offset += EXPORT_PAGE_SIZE;
				}
				stream.push(null);
			} catch (err) {
				stream.destroy(err as Error);
			}
		})();

		return {
			stream,
			totalRows: () => totalRows,
		};
	}
}

function serialiseRow(l: AuditLog): string {
	return [
		csvEscape(l.id),
		csvEscape(l.actorId),
		csvEscape(l.action),
		csvEscape(l.targetType),
		csvEscape(l.targetId),
		csvEscape(JSON.stringify(l.metadata ?? {})),
		csvEscape(l.createdAt.toISOString()),
	].join(',');
}

/**
 * Escape a value for CSV output. Always quotes the result and:
 *   - doubles embedded quotes per RFC 4180
 *   - neutralises formula-injection vectors by prefixing a single quote when
 *     the value starts with =, +, -, @, tab or carriage return.
 */
function csvEscape(value: string): string {
	const raw = value ?? '';
	const sanitised = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
	return `"${sanitised.replace(/"/g, '""')}"`;
}
