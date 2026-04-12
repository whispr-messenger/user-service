import { Controller, Get, Post, Query, Body, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserSearchService, UserSearchResult } from '../services/user-search.service';
import { User } from '../../common/entities/user.entity';
import { BatchPhoneSearchDto } from '../dto/batch-phone-search.dto';
import { PhoneSearchQueryDto } from '../dto/phone-search-query.dto';
import { NameSearchQueryDto } from '../dto/name-search-query.dto';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class UserSearchController {
	constructor(private readonly userSearchService: UserSearchService) {}

	@Get('phone')
	@ApiOperation({ summary: 'Search user by phone number' })
	@ApiResponse({ status: HttpStatus.OK, description: 'User found or null' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async searchByPhone(@Query() dto: PhoneSearchQueryDto): Promise<User | null> {
		return this.userSearchService.searchByPhone(dto.phoneNumber);
	}

	@Post('phone/batch')
	@ApiOperation({ summary: 'Search users by phone numbers in batch' })
	@ApiResponse({ status: HttpStatus.OK, description: 'List of matched users' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async searchByPhoneBatch(@Body() dto: BatchPhoneSearchDto): Promise<User[]> {
		return this.userSearchService.searchByPhoneBatch(dto.phoneNumbers);
	}

	@Get('username')
	@ApiOperation({ summary: 'Search user by username' })
	@ApiResponse({ status: HttpStatus.OK, description: 'User found or null' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async searchByUsername(@Query('username') username: string): Promise<User | null> {
		return this.userSearchService.searchByUsername(username);
	}

	@Get('name')
	@ApiOperation({ summary: 'Search users by display name' })
	@ApiResponse({ status: HttpStatus.OK, description: 'List of matching users' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async searchByName(@Query() dto: NameSearchQueryDto): Promise<UserSearchResult[]> {
		return this.userSearchService.searchByDisplayName(dto.query, dto.limit);
	}
}
