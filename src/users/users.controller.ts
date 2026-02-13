import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Put,
	Param,
	Delete,
	Query,
	ParseUUIDPipe,
	ParseIntPipe,
	HttpStatus,
	Req,
	UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { PrivacyService } from '../privacy/privacy.service';
import { CreateUserDto, UpdateUserDto, UpdatePrivacySettingsDto } from '../dto';
import { User, PrivacySettings } from '../entities';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
	constructor(
		private readonly usersService: UsersService,
		private readonly privacyService: PrivacyService
	) {}

	@Post()
	@ApiOperation({ summary: 'Create a new user' })
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: 'User created successfully',
		type: User,
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: 'Phone number or username already exists',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Invalid input data',
	})
	async create(@Body() createUserDto: CreateUserDto): Promise<User> {
		return this.usersService.create(createUserDto);
	}

	@Get('me')
	@ApiOperation({ summary: 'Get current user profile' })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'User profile retrieved successfully',
		type: User,
	})
	async getMe(@Req() req): Promise<User> {
		const userId = req.user?.id || req.headers['x-user-id'];
		if (!userId) {
			throw new UnauthorizedException(
				'User not authenticated. Provide x-user-id header or valid token.'
			);
		}
		return this.usersService.getMe(userId);
	}

	@Get('me/privacy')
	@ApiOperation({ summary: 'Get current user privacy settings' })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Privacy settings retrieved successfully',
		type: PrivacySettings,
	})
	async getMyPrivacySettings(@Req() req): Promise<PrivacySettings> {
		const userId = req.user?.id || req.headers['x-user-id'];
		if (!userId) {
			throw new UnauthorizedException(
				'User not authenticated. Provide x-user-id header or valid token.'
			);
		}
		return this.privacyService.getPrivacySettings(userId);
	}

	@Put('me/privacy')
	@ApiOperation({ summary: 'Update current user privacy settings' })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Privacy settings updated successfully',
		type: PrivacySettings,
	})
	async updateMyPrivacySettings(
		@Req() req,
		@Body() updatePrivacySettingsDto: UpdatePrivacySettingsDto
	): Promise<PrivacySettings> {
		const userId = req.user?.id || req.headers['x-user-id'];
		if (!userId) {
			throw new UnauthorizedException(
				'User not authenticated. Provide x-user-id header or valid token.'
			);
		}
		return this.privacyService.updatePrivacySettings(userId, updatePrivacySettingsDto);
	}

	@Get()
	@ApiOperation({ summary: 'Get all users with pagination' })
	@ApiQuery({
		name: 'page',
		required: false,
		type: Number,
		description: 'Page number (default: 1)',
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
		description: 'Items per page (default: 10)',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Users retrieved successfully',
	})
	async findAll(
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10
	): Promise<{ users: User[]; total: number }> {
		return this.usersService.findAll(page, limit);
	}

	@Get('search')
	@ApiOperation({ summary: 'Search users' })
	@ApiQuery({
		name: 'q',
		required: true,
		type: String,
		description: 'Search query (username, name, or phone number)',
	})
	@ApiQuery({
		name: 'page',
		required: false,
		type: Number,
		description: 'Page number (default: 1)',
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
		description: 'Items per page (default: 20)',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Search results',
	})
	async search(
		@Query('q') query: string,
		@Req() req,
		@Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
		@Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20
	): Promise<{ users: Partial<User>[]; total: number }> {
		const userId = req.user?.id || req.headers['x-user-id'];
		if (!userId) {
			throw new UnauthorizedException(
				'User not authenticated. Provide x-user-id header or valid token.'
			);
		}
		return this.usersService.searchUsers(query, userId, page, limit);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get user by ID' })
	@ApiParam({
		name: 'id',
		type: 'string',
		format: 'uuid',
		description: 'User ID',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'User retrieved successfully',
		type: User,
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User not found',
	})
	async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req): Promise<Partial<User>> {
		const requesterId = req.user?.id || req.headers['x-user-id'];
		if (!requesterId) {
			// Treat as anonymous if allowed, or throw
			return this.usersService.getProfile(id, 'anonymous');
		}
		return this.usersService.getProfile(id, requesterId);
	}

	@Get('phone/:phoneNumber')
	@ApiOperation({ summary: 'Get user by phone number' })
	@ApiParam({
		name: 'phoneNumber',
		type: 'string',
		description: 'Phone number in E.164 format',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'User retrieved successfully',
		type: User,
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User not found',
	})
	async findByPhoneNumber(@Param('phoneNumber') phoneNumber: string): Promise<User | null> {
		return this.usersService.findByPhoneNumber(phoneNumber);
	}

	@Get('username/:username')
	@ApiOperation({ summary: 'Get user by username' })
	@ApiParam({
		name: 'username',
		type: 'string',
		description: 'Username',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'User retrieved successfully',
		type: User,
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User not found',
	})
	async findByUsername(@Param('username') username: string): Promise<User | null> {
		return this.usersService.findByUsername(username);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update user' })
	@ApiParam({
		name: 'id',
		type: 'string',
		format: 'uuid',
		description: 'User ID',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'User updated successfully',
		type: User,
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User not found',
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: 'Username already exists',
	})
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateUserDto: UpdateUserDto,
		@Req() req
	): Promise<User> {
		const userId = req.user?.id || req.headers['x-user-id'];
		if (!userId) {
			throw new UnauthorizedException(
				'User not authenticated. Provide x-user-id header or valid token.'
			);
		}
		if (userId !== id) {
			throw new UnauthorizedException('You can only update your own profile');
		}
		return this.usersService.update(id, updateUserDto);
	}

	@Patch(':id/last-seen')
	@ApiOperation({ summary: 'Update user last seen timestamp' })
	@ApiParam({
		name: 'id',
		type: 'string',
		format: 'uuid',
		description: 'User ID',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Last seen updated successfully',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User not found',
	})
	async updateLastSeen(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
		return this.usersService.updateLastSeen(id);
	}

	@Patch(':id/deactivate')
	@ApiOperation({ summary: 'Deactivate user account' })
	@ApiParam({
		name: 'id',
		type: 'string',
		format: 'uuid',
		description: 'User ID',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'User deactivated successfully',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User not found',
	})
	async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
		return this.usersService.deactivate(id);
	}

	@Patch(':id/activate')
	@ApiOperation({ summary: 'Activate user account' })
	@ApiParam({
		name: 'id',
		type: 'string',
		format: 'uuid',
		description: 'User ID',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'User activated successfully',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User not found',
	})
	async activate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
		return this.usersService.activate(id);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Soft delete user' })
	@ApiParam({
		name: 'id',
		type: 'string',
		format: 'uuid',
		description: 'User ID',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'User deleted successfully',
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User not found',
	})
	async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
		return this.usersService.remove(id);
	}
}
