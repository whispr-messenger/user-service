import { Controller, Get, Query, HttpStatus, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from '../services/audit.service';
import type { Request as ExpressRequest, Response } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
	constructor(private readonly auditService: AuditService) {}

	@Get()
	@ApiOperation({ summary: 'List audit logs (admin/moderator only)' })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'offset', required: false, type: Number })
	@ApiQuery({ name: 'actorId', required: false, type: String })
	@ApiQuery({ name: 'targetType', required: false, type: String })
	@ApiQuery({ name: 'action', required: false, type: String })
	@ApiResponse({ status: HttpStatus.OK, description: 'Paginated audit logs' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async list(
		@Query('limit') limit: string,
		@Query('offset') offset: string,
		@Query('actorId') actorId: string,
		@Query('targetType') targetType: string,
		@Query('action') action: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		return this.auditService.list(req.user.sub, {
			limit: limit ? parseInt(limit) : 50,
			offset: offset ? parseInt(offset) : 0,
			actorId: actorId || undefined,
			targetType: targetType || undefined,
			action: action || undefined,
		});
	}

	@Get('export')
	@ApiOperation({ summary: 'Export audit logs as CSV (admin/moderator only)' })
	@ApiResponse({ status: HttpStatus.OK, description: 'CSV file download' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async exportCsv(@Request() req: ExpressRequest & { user: JwtPayload }, @Res() res: Response) {
		const csv = await this.auditService.exportCsv(req.user.sub);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
		res.send(csv);
	}
}
