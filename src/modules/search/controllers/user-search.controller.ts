import { Controller, Get, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserSearchService, UserSearchResult } from '../services/user-search.service';
import { User } from '../../common/entities/user.entity';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class UserSearchController {
	constructor(private readonly userSearchService: UserSearchService) {}

	@Get('phone')
	@ApiOperation({ summary: 'Search user by phone number' })
	@ApiQuery({ name: 'phoneNumber', type: 'string', description: 'E.164 phone number' })
	@ApiResponse({ status: HttpStatus.OK, description: 'User found or null' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async searchByPhone(@Query('phoneNumber') phoneNumber: string): Promise<User | null> {
		return this.userSearchService.searchByPhone(phoneNumber);
	}

	@Get('username')
	@ApiOperation({ summary: 'Search user by username' })
	@ApiQuery({ name: 'username', type: 'string', description: 'Username' })
	@ApiResponse({ status: HttpStatus.OK, description: 'User found or null' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async searchByUsername(@Query('username') username: string): Promise<User | null> {
		return this.userSearchService.searchByUsername(username);
	}

	@Get('name')
	@ApiOperation({ summary: 'Search users by display name' })
	@ApiQuery({ name: 'query', type: 'string', description: 'Name search query' })
	@ApiQuery({ name: 'limit', type: 'number', required: false, description: 'Max results (default 20)' })
	@ApiResponse({ status: HttpStatus.OK, description: 'List of matching users' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async searchByName(
		@Query('query') query: string,
		@Query('limit') limit?: number
	): Promise<UserSearchResult[]> {
		return this.userSearchService.searchByDisplayName(query, limit);
	}
}
