import { Controller, Get, Query, HttpStatus, Request, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from '../services/audit.service';
import type { Request as ExpressRequest, Response } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { RolesGuard } from '../../roles/roles.guard';
import { Roles } from '../../roles/roles.decorator';

// WHISPR-1053: parse ISO 8601 query params. Invalid or empty → undefined
// so the repository layer treats them as "no filter".
function parseIsoDate(value?: string): Date | undefined {
	if (!value) return undefined;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('admin', 'moderator')
@Controller('audit-logs')
export class AuditController {
	constructor(private readonly auditService: AuditService) {}

	@Get()
	@ApiOperation({ summary: 'List audit logs (admin/moderator only)' })
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
		description: 'Number of results to return (default: 50)',
	})
	@ApiQuery({
		name: 'offset',
		required: false,
		type: Number,
		description: 'Number of results to skip (default: 0)',
	})
	@ApiQuery({ name: 'actorId', required: false, type: String, description: 'Filter by actor user ID' })
	@ApiQuery({
		name: 'targetType',
		required: false,
		type: String,
		description: 'Filter by target type (e.g. sanction, appeal, user)',
	})
	@ApiQuery({ name: 'action', required: false, type: String, description: 'Filter by action type' })
	@ApiQuery({
		name: 'dateFrom',
		required: false,
		type: String,
		description: 'Inclusive lower bound on created_at (ISO 8601, WHISPR-1053)',
	})
	@ApiQuery({
		name: 'dateTo',
		required: false,
		type: String,
		description: 'Inclusive upper bound on created_at (ISO 8601, WHISPR-1053)',
	})
	@ApiResponse({ status: HttpStatus.OK, description: 'Paginated audit logs' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async list(
		@Query('limit') limit: string,
		@Query('offset') offset: string,
		@Query('actorId') actorId: string,
		@Query('targetType') targetType: string,
		@Query('action') action: string,
		@Query('dateFrom') dateFrom: string,
		@Query('dateTo') dateTo: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		return this.auditService.list(req.user.sub, {
			limit: limit ? parseInt(limit) : 50,
			offset: offset ? parseInt(offset) : 0,
			actorId: actorId || undefined,
			targetType: targetType || undefined,
			action: action || undefined,
			dateFrom: parseIsoDate(dateFrom),
			dateTo: parseIsoDate(dateTo),
		});
	}

	@Get('export')
	@ApiOperation({ summary: 'Export audit logs as CSV (admin/moderator only)' })
	@ApiResponse({ status: HttpStatus.OK, description: 'CSV file download' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async exportCsv(@Request() req: ExpressRequest & { user: JwtPayload }, @Res() res: Response) {
		const csv = await this.auditService.exportCsv(req.user.sub);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
		res.send(csv);
	}
}
