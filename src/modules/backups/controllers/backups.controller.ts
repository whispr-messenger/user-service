import { Controller, Get, Post, Body, Param, ParseUUIDPipe, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { BackupsService } from '../services/backups.service';
import { CreateBackupDto } from '../dto/create-backup.dto';
import { UserBackup } from '../entities/user-backup.entity';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

@ApiTags('Backups')
@ApiBearerAuth()
@Controller('users/me/backups')
export class BackupsController {
	constructor(private readonly backupsService: BackupsService) {}

	@Post()
	@ApiOperation({
		summary: 'Upload a new backup for the authenticated user',
		description:
			'Stores a JSON backup payload produced by the client export flow. Rate limited to one upload per 24h per user.',
	})
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Backup created successfully' })
	@ApiResponse({ status: HttpStatus.PAYLOAD_TOO_LARGE, description: 'Backup payload too large' })
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: 'Upload rate limit exceeded (1 per 24h)',
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async create(
		@Body() dto: CreateBackupDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<UserBackup> {
		return this.backupsService.create(req.user.sub, dto.data);
	}

	@Get()
	@ApiOperation({
		summary: 'List backups for the authenticated user',
		description: 'Returns metadata for every backup stored for the user (payload is not included).',
	})
	@ApiResponse({ status: HttpStatus.OK, description: 'List of backups' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async list(@Request() req: ExpressRequest & { user: JwtPayload }): Promise<UserBackup[]> {
		return this.backupsService.list(req.user.sub);
	}

	@Get(':id')
	@ApiOperation({
		summary: 'Fetch a specific backup payload',
		description: 'Returns the full backup JSON. The client decides how to reapply the data locally.',
	})
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Backup ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Backup payload' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Backup not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async get(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<UserBackup> {
		return this.backupsService.get(req.user.sub, id);
	}

	@Post(':id/restore')
	@ApiOperation({
		summary: 'Restore a backup by forwarding its payload to the messaging-service',
		description:
			'Reads the stored backup payload and POSTs it to the messaging-service restore endpoint so the user conversations are re-materialised server side.',
	})
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Backup ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Restore job accepted by messaging-service' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Backup not found' })
	@ApiResponse({ status: HttpStatus.BAD_GATEWAY, description: 'Messaging-service rejected the restore' })
	@ApiResponse({
		status: HttpStatus.SERVICE_UNAVAILABLE,
		description: 'Messaging-service unreachable',
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async restore(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<{ status: string; backupId: string }> {
		return this.backupsService.restore(req.user.sub, id);
	}
}
