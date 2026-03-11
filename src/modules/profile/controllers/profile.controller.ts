import { Controller, Get, Patch, Param, Body, ParseUUIDPipe, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { User } from '../../common/entities/user.entity';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
	constructor(private readonly profileService: ProfileService) {}

	@Get(':id')
	@ApiOperation({ summary: 'Get user profile' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Profile retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getProfile(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
		return this.profileService.getProfile(id);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update user profile' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Profile updated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Username already taken' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async updateProfile(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateProfileDto
	): Promise<User> {
		return this.profileService.updateProfile(id, dto);
	}
}
