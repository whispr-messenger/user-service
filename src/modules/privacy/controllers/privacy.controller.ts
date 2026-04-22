import {
	Controller,
	Get,
	Patch,
	Body,
	HttpStatus,
	Request,
	Param,
	ParseUUIDPipe,
	ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
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

	@Get(':userId')
	@ApiOperation({
		summary: 'Get privacy settings by user id',
		description:
			'Returns privacy settings for the given user id. Only the owner of the settings is allowed to fetch them; other callers get 403.',
	})
	@ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Privacy settings retrieved successfully' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Cannot access another user privacy settings' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getSettingsByUserId(
		@Param('userId', ParseUUIDPipe) userId: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<PrivacySettings> {
		if (req.user.sub !== userId) {
			throw new ForbiddenException('Cannot access another user privacy settings');
		}
		return this.privacyService.getSettings(userId);
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
