import {
	Controller,
	ForbiddenException,
	Get,
	Patch,
	Param,
	Body,
	ParseUUIDPipe,
	HttpStatus,
	Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { User } from '../../common/entities/user.entity';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

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
	@ApiOperation({ summary: 'Update own profile' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Profile updated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Username already taken' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Cannot update another user\'s profile' })
	async updateProfile(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateProfileDto,
		@Request() req: ExpressRequest & { user: JwtPayload },
	): Promise<User> {
		// The JWT sub claim is the authoritative user identity — prevent users from
		// updating each other's profiles by comparing the route param to the caller.
		if (req.user?.sub !== id) {
			throw new ForbiddenException('Cannot update another user\'s profile');
		}
		return this.profileService.updateProfile(id, dto);
	}
}
