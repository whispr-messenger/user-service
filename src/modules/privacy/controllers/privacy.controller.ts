import { Controller, Get, Patch, Param, Body, ParseUUIDPipe, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PrivacyService } from '../services/privacy.service';
import { UpdatePrivacySettingsDto } from '../dto/update-privacy-settings.dto';
import { PrivacySettings } from '../entities/privacy-settings.entity';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { assertOwnership } from '../../jwt-auth/ownership.util';

@ApiTags('Privacy')
@ApiBearerAuth()
@Controller('privacy')
export class PrivacyController {
	constructor(private readonly privacyService: PrivacyService) {}

	@Get(':userId')
	@ApiOperation({ summary: 'Get privacy settings for a user' })
	@ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Privacy settings retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getSettings(
		@Param('userId', ParseUUIDPipe) userId: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<PrivacySettings> {
		assertOwnership(req, userId);
		return this.privacyService.getSettings(userId);
	}

	@Patch(':userId')
	@ApiOperation({ summary: 'Update privacy settings for a user' })
	@ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Privacy settings updated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async updateSettings(
		@Param('userId', ParseUUIDPipe) userId: string,
		@Body() dto: UpdatePrivacySettingsDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<PrivacySettings> {
		assertOwnership(req, userId);
		return this.privacyService.updateSettings(userId, dto);
	}
}
