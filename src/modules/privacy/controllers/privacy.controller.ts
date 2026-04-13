import { Controller, Get, Patch, Body, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrivacyService } from '../services/privacy.service';
import { UpdatePrivacySettingsDto } from '../dto/update-privacy-settings.dto';
import { PrivacySettings } from '../entities/privacy-settings.entity';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

@ApiTags('Privacy')
@ApiBearerAuth()
@Controller('privacy')
export class PrivacyController {
	constructor(private readonly privacyService: PrivacyService) {}

	@Get()
	@ApiOperation({ summary: 'Get privacy settings for the authenticated user' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Privacy settings retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getSettings(@Request() req: ExpressRequest & { user: JwtPayload }): Promise<PrivacySettings> {
		return this.privacyService.getSettings(req.user.sub);
	}

	@Patch()
	@ApiOperation({ summary: 'Update privacy settings for the authenticated user' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Privacy settings updated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async updateSettings(
		@Body() dto: UpdatePrivacySettingsDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<PrivacySettings> {
		return this.privacyService.updateSettings(req.user.sub, dto);
	}
}
