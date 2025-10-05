import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { BlockedUsersService } from './blocked-users.service';
import { BlockUserDto } from '../dto';
import { BlockedUser } from '../entities';

@ApiTags('blocked-users')
@ApiBearerAuth()
@Controller('blocked-users')
export class BlockedUsersController {
  constructor(private readonly blockedUsersService: BlockedUsersService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Block a user' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID who is blocking',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User blocked successfully',
    type: BlockedUser,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User is already blocked',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User to block not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot block yourself',
  })
  async blockUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() blockUserDto: BlockUserDto,
  ): Promise<BlockedUser> {
    return this.blockedUsersService.blockUser(userId, blockUserDto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get blocked users with pagination' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
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
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Blocked users retrieved successfully',
  })
  async getBlockedUsers(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ): Promise<{ blockedUsers: BlockedUser[]; total: number }> {
    return this.blockedUsersService.getBlockedUsers(userId, page, limit);
  }

  @Get(':userId/search')
  @ApiOperation({ summary: 'Search blocked users' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiQuery({
    name: 'q',
    type: 'string',
    description: 'Search query',
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
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
  })
  async searchBlockedUsers(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ): Promise<{ blockedUsers: BlockedUser[]; total: number }> {
    return this.blockedUsersService.searchBlockedUsers(
      userId,
      query,
      page,
      limit,
    );
  }

  @Get(':userId/count')
  @ApiOperation({ summary: 'Get blocked users count' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Blocked users count retrieved successfully',
    schema: { type: 'number' },
  })
  async getBlockedUsersCount(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<number> {
    return this.blockedUsersService.getBlockedUsersCount(userId);
  }

  @Get(':userId/blocking-me')
  @ApiOperation({ summary: 'Get users who blocked this user' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
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
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users blocking this user retrieved successfully',
  })
  async getBlockingUsers(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ): Promise<{ blockingUsers: BlockedUser[]; total: number }> {
    return this.blockedUsersService.getBlockingUsers(userId, page, limit);
  }

  @Get(':userId/is-blocked/:targetUserId')
  @ApiOperation({ summary: 'Check if user is blocked' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiParam({
    name: 'targetUserId',
    type: 'string',
    format: 'uuid',
    description: 'Target user ID to check',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Block status retrieved successfully',
    schema: { type: 'boolean' },
  })
  async isUserBlocked(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ): Promise<boolean> {
    return this.blockedUsersService.isUserBlocked(userId, targetUserId);
  }

  @Get(':userId/:blockedUserId')
  @ApiOperation({ summary: 'Get specific blocked user' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiParam({
    name: 'blockedUserId',
    type: 'string',
    format: 'uuid',
    description: 'Blocked user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Blocked user retrieved successfully',
    type: BlockedUser,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Blocked user not found',
  })
  async getBlockedUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('blockedUserId', ParseUUIDPipe) blockedUserId: string,
  ): Promise<BlockedUser> {
    return this.blockedUsersService.getBlockedUser(userId, blockedUserId);
  }

  @Patch(':userId/:blockedUserId/reason')
  @ApiOperation({ summary: 'Update block reason' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiParam({
    name: 'blockedUserId',
    type: 'string',
    format: 'uuid',
    description: 'Blocked user ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'New block reason',
          maxLength: 500,
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Block reason updated successfully',
    type: BlockedUser,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Blocked user not found',
  })
  async updateBlockReason(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('blockedUserId', ParseUUIDPipe) blockedUserId: string,
    @Body('reason') reason: string,
  ): Promise<BlockedUser> {
    return this.blockedUsersService.updateBlockReason(
      userId,
      blockedUserId,
      reason,
    );
  }

  @Delete(':userId/:blockedUserId')
  @ApiOperation({ summary: 'Unblock user' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiParam({
    name: 'blockedUserId',
    type: 'string',
    format: 'uuid',
    description: 'Blocked user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User unblocked successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Blocked user not found',
  })
  async unblockUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('blockedUserId', ParseUUIDPipe) blockedUserId: string,
  ): Promise<void> {
    return this.blockedUsersService.unblockUser(userId, blockedUserId);
  }
}
