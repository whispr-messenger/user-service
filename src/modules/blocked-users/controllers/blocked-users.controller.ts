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
	Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { BlockedUsersService } from '../services/blocked-users.service';
import { BlockUserDto } from '../dto/block-user.dto';
import { BlockedUser } from '../entities/blocked-user.entity';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

@ApiTags('Blocked Users')
@ApiBearerAuth()
@Controller('blocked-users')
export class BlockedUsersController {
	constructor(private readonly blockedUsersService: BlockedUsersService) {}

	@Get()
	@ApiOperation({ summary: 'Get all blocked users for the authenticated user' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Blocked users retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getBlockedUsers(@Request() req: ExpressRequest & { user: JwtPayload }): Promise<BlockedUser[]> {
		return this.blockedUsersService.getBlockedUsers(req.user.sub);
	}

	@Post()
	@ApiOperation({ summary: 'Block a user' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'User blocked successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'User is already blocked' })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot block yourself' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async blockUser(
		@Body() dto: BlockUserDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<BlockedUser> {
		return this.blockedUsersService.blockUser(req.user.sub, dto);
	}

	@Delete(':blockedId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Unblock a user' })
	@ApiParam({ name: 'blockedId', type: 'string', format: 'uuid', description: 'Blocked user ID' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'User unblocked successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User or blocked entry not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async unblockUser(
		@Param('blockedId', ParseUUIDPipe) blockedId: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<void> {
		return this.blockedUsersService.unblockUser(req.user.sub, blockedId);
	}
}
