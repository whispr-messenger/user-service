import { Controller, Get, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchIndexService } from '../../cache/search-index.service';
import { SearchPhoneDto } from '../dto/search-phone.dto';
import { SearchUsernameDto } from '../dto/search-username.dto';
import { SearchNameDto } from '../dto/search-name.dto';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
	constructor(private readonly searchIndexService: SearchIndexService) {}

	@Get('phone')
	@ApiOperation({ summary: 'Search user by phone number hash' })
	@ApiResponse({ status: HttpStatus.OK, description: 'User ID if found' })
	async searchByPhone(@Query() dto: SearchPhoneDto): Promise<{ userId: string | null }> {
		const userId = await this.searchIndexService.searchByPhoneNumber(dto.hash);
		return { userId };
	}

	@Get('username')
	@ApiOperation({ summary: 'Search user by username' })
	@ApiResponse({ status: HttpStatus.OK, description: 'User ID if found' })
	async searchByUsername(@Query() dto: SearchUsernameDto): Promise<{ userId: string | null }> {
		const userId = await this.searchIndexService.searchByUsername(dto.query);
		return { userId };
	}

	@Get('name')
	@ApiOperation({ summary: 'Search users by name' })
	@ApiResponse({ status: HttpStatus.OK, description: 'List of matching user IDs' })
	async searchByName(@Query() dto: SearchNameDto): Promise<{ userIds: string[] }> {
		const userIds = await this.searchIndexService.searchByName(dto.query, dto.limit);
		const offset = dto.offset ?? 0;
		return { userIds: userIds.slice(offset) };
	}
}
