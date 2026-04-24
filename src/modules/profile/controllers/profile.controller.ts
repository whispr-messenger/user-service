import { Controller, Get, Patch, Param, Body, ParseUUIDPipe, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ProfileService } from '../services/profile.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UserResponseDto } from '../../common/dto/user-response.dto';
import { SelfProfileResponseDto } from '../dto/self-profile-response.dto';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { assertOwnership } from '../../jwt-auth/ownership.util';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
	constructor(private readonly profileService: ProfileService) {}

	@Get('me')
	@SkipThrottle()
	@ApiOperation({ summary: 'Get my own profile (includes phoneNumber)' })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Profile retrieved successfully',
		type: SelfProfileResponseDto,
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	async getMyProfile(
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<SelfProfileResponseDto> {
		const user = await this.profileService.getProfile(req.user.sub);
		return SelfProfileResponseDto.fromEntity(user);
	}

	@Get(':id')
	@SkipThrottle()
	@ApiOperation({ summary: 'Get user profile' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Profile retrieved successfully',
		type: UserResponseDto,
	})
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getProfile(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<UserResponseDto> {
		const requesterId: string = req.user?.sub ?? '';
		const user = await this.profileService.getProfileWithPrivacy(id, requesterId);
		return UserResponseDto.fromEntity(user);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update own profile' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Profile updated successfully',
		type: UserResponseDto,
	})
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Username already taken' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Cannot update another user's profile" })
	async updateProfile(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateProfileDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<UserResponseDto> {
		assertOwnership(req, id, "Cannot update another user's profile");
		const authorization = (req.headers['authorization'] as string | undefined) ?? undefined;

		const user = await this.profileService.updateProfile(id, dto, authorization);
		return UserResponseDto.fromEntity(user);
	}
}
