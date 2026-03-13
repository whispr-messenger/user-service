import {
	Controller,
	Get,
	Patch,
	Put,
	Delete,
	Param,
	Body,
	Headers,
	ParseUUIDPipe,
	HttpStatus,
	HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ProfileService, PublicProfile } from '../services/profile.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UploadPhotoDto } from '../dto/upload-photo.dto';
import { ChangePhoneDto } from '../dto/change-phone.dto';
import { User } from '../../common/entities/user.entity';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
	constructor(private readonly profileService: ProfileService) {}

	@Get(':id')
	@ApiOperation({ summary: 'Get user profile (privacy-aware)' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Target user ID' })
	@ApiHeader({
		name: 'x-user-id',
		description: 'Requester user ID (set by API gateway)',
		required: false,
	})
	@ApiResponse({ status: HttpStatus.OK, description: 'Profile retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Cannot view this profile (blocked)' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getProfile(
		@Param('id', ParseUUIDPipe) id: string,
		@Headers('x-user-id') requesterId?: string
	): Promise<User | PublicProfile> {
		if (requesterId && requesterId !== id) {
			return this.profileService.getProfileForRequester(id, requesterId);
		}
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

	@Put(':id/photo')
	@ApiOperation({ summary: 'Upload or update profile photo' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Profile photo updated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async uploadPhoto(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UploadPhotoDto): Promise<User> {
		return this.profileService.uploadPhoto(id, dto);
	}

	@Delete(':id/photo')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Delete profile photo' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Profile photo deleted successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async deletePhoto(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
		return this.profileService.deletePhoto(id);
	}

	@Patch(':id/phone')
	@ApiOperation({ summary: 'Change phone number (requires verification)' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Phone number changed successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Phone number already in use' })
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'New phone number is the same as current',
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async changePhoneNumber(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: ChangePhoneDto
	): Promise<User> {
		return this.profileService.changePhoneNumber(id, dto);
	}
}
