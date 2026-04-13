import {
	Controller,
	Get,
	Post,
	Delete,
	Param,
	Body,
	Query,
	ParseUUIDPipe,
	HttpCode,
	HttpStatus,
	Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { BlockedUsersService } from '../services/blocked-users.service';
import { BlockUserDto } from '../dto/block-user.dto';
import { BlockedUser } from '../entities/blocked-user.entity';
import { CursorPaginationDto, CursorPaginatedResult } from '../../common/dto/cursor-pagination.dto';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { assertOwnership } from '../../jwt-auth/ownership.util';

@ApiTags('Blocked Users')
@ApiBearerAuth()
@Controller('blocked-users')
export class BlockedUsersController {
	constructor(private readonly blockedUsersService: BlockedUsersService) {}

	@Get(':blockerId')
	@ApiOperation({ summary: 'Get paginated blocked users for a user' })
	@ApiParam({ name: 'blockerId', type: 'string', format: 'uuid', description: 'Blocker user ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Blocked users retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	async getBlockedUsers(
		@Param('blockerId', ParseUUIDPipe) blockerId: string,
		@Query() pagination: CursorPaginationDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<CursorPaginatedResult<BlockedUser>> {
		assertOwnership(req, blockerId);
		return this.blockedUsersService.getBlockedUsers(blockerId, pagination.limit, pagination.cursor);
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
		@Body() dto: BlockUserDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<BlockedUser> {
		assertOwnership(req, blockerId);
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
		@Param('blockedId', ParseUUIDPipe) blockedId: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<void> {
		assertOwnership(req, blockerId);
		return this.blockedUsersService.unblockUser(blockerId, blockedId);
	}
}
