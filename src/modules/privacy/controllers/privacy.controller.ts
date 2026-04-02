import { Controller, Get, Patch, Param, Body, ParseUUIDPipe, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PrivacyService } from '../services/privacy.service';
import { UpdatePrivacySettingsDto } from '../dto/update-privacy-settings.dto';
import { PrivacySettings } from '../entities/privacy-settings.entity';

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
	async getSettings(@Param('userId', ParseUUIDPipe) userId: string): Promise<PrivacySettings> {
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
		@Body() dto: UpdatePrivacySettingsDto
	): Promise<PrivacySettings> {
		return this.privacyService.updateSettings(userId, dto);
	}
}
