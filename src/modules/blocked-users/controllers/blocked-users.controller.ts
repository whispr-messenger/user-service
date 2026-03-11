import {
	Controller,
	Get,
	Post,
	Delete,
	Param,
	Body,
	ParseUUIDPipe,
	HttpCode,
	HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { BlockedUsersService } from '../services/blocked-users.service';
import { BlockUserDto } from '../dto/block-user.dto';
import { BlockedUser } from '../entities/blocked-user.entity';

@ApiTags('Blocked Users')
@ApiBearerAuth()
@Controller('blocked-users')
export class BlockedUsersController {
	constructor(private readonly blockedUsersService: BlockedUsersService) {}

	@Get(':blockerId')
	@ApiOperation({ summary: 'Get all blocked users for a user' })
	@ApiParam({ name: 'blockerId', type: 'string', format: 'uuid', description: 'Blocker user ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Blocked users retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	async getBlockedUsers(@Param('blockerId', ParseUUIDPipe) blockerId: string): Promise<BlockedUser[]> {
		return this.blockedUsersService.getBlockedUsers(blockerId);
	}

	@Post(':blockerId')
	@ApiOperation({ summary: 'Block a user' })
	@ApiParam({ name: 'blockerId', type: 'string', format: 'uuid', description: 'Blocker user ID' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'User blocked successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'User is already blocked' })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot block yourself' })
	async blockUser(
		@Param('blockerId', ParseUUIDPipe) blockerId: string,
		@Body() dto: BlockUserDto
	): Promise<BlockedUser> {
		return this.blockedUsersService.blockUser(blockerId, dto);
	}

	@Delete(':blockerId/:blockedId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Unblock a user' })
	@ApiParam({ name: 'blockerId', type: 'string', format: 'uuid', description: 'Blocker user ID' })
	@ApiParam({ name: 'blockedId', type: 'string', format: 'uuid', description: 'Blocked user ID' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'User unblocked successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User or blocked entry not found' })
	async unblockUser(
		@Param('blockerId', ParseUUIDPipe) blockerId: string,
		@Param('blockedId', ParseUUIDPipe) blockedId: string
	): Promise<void> {
		return this.blockedUsersService.unblockUser(blockerId, blockedId);
	}
}
