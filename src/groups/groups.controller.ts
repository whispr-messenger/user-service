import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, AddGroupMemberDto } from '../dto';
import { Group, GroupMember, GroupRole } from '../entities';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    type: Group,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async createGroup(
    @Body() createGroupDto: CreateGroupDto,
    @Request() req: any,
  ): Promise<Group> {
    return this.groupsService.createGroup(createGroupDto, req.user.id);
  }

  @Get('my-groups')
  @ApiOperation({ summary: 'Get current user groups' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'User groups retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        groups: {
          type: 'array',
          items: { $ref: '#/components/schemas/Group' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getUserGroups(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<{
    groups: Group[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.groupsService.findUserGroups(req.user.id, page, limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search groups by name' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Groups search results',
    schema: {
      type: 'object',
      properties: {
        groups: {
          type: 'array',
          items: { $ref: '#/components/schemas/Group' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async searchGroups(
    @Request() req: any,
    @Query('q') query: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<{
    groups: Group[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.groupsService.searchGroups(query, req.user.id, page, limit);
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Get group by ID' })
  @ApiParam({ name: 'groupId', type: 'string', description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Group retrieved successfully',
    type: Group,
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getGroupById(
    @Param('groupId') groupId: string,
    @Request() req: any,
  ): Promise<Group> {
    return this.groupsService.findGroupById(groupId, req.user.id);
  }

  @Put(':groupId')
  @ApiOperation({ summary: 'Update group information' })
  @ApiParam({ name: 'groupId', type: 'string', description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
    type: Group,
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 403, description: 'Access denied - Admin only' })
  async updateGroup(
    @Param('groupId') groupId: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @Request() req: any,
  ): Promise<Group> {
    return this.groupsService.updateGroup(groupId, updateGroupDto, req.user.id);
  }

  @Delete(':groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete group' })
  @ApiParam({ name: 'groupId', type: 'string', description: 'Group ID' })
  @ApiResponse({ status: 204, description: 'Group deleted successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Creator/Admin only',
  })
  async deleteGroup(
    @Param('groupId') groupId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.groupsService.deleteGroup(groupId, req.user.id);
  }

  @Get(':groupId/members')
  @ApiOperation({ summary: 'Get group members' })
  @ApiParam({ name: 'groupId', type: 'string', description: 'Group ID' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Group members retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        members: {
          type: 'array',
          items: { $ref: '#/components/schemas/GroupMember' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 403, description: 'Access denied - Members only' })
  async getGroupMembers(
    @Param('groupId') groupId: string,
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ): Promise<{
    members: GroupMember[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.groupsService.getGroupMembers(
      groupId,
      req.user.id,
      page,
      limit,
    );
  }

  @Post(':groupId/members')
  @ApiOperation({ summary: 'Add member to group' })
  @ApiParam({ name: 'groupId', type: 'string', description: 'Group ID' })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
    type: GroupMember,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - User already member',
  })
  @ApiResponse({ status: 404, description: 'Group or user not found' })
  @ApiResponse({ status: 403, description: 'Access denied - Admin only' })
  async addMember(
    @Param('groupId') groupId: string,
    @Body() addMemberDto: AddGroupMemberDto,
    @Request() req: any,
  ): Promise<GroupMember> {
    return this.groupsService.addMember(groupId, addMemberDto, req.user.id);
  }

  @Delete(':groupId/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from group' })
  @ApiParam({ name: 'groupId', type: 'string', description: 'Group ID' })
  @ApiParam({ name: 'memberId', type: 'string', description: 'Member user ID' })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @ApiResponse({ status: 404, description: 'Group or member not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 400, description: 'Cannot remove last admin' })
  async removeMember(
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.groupsService.removeMember(groupId, memberId, req.user.id);
  }

  @Put(':groupId/members/:memberId/role')
  @ApiOperation({ summary: 'Update member role' })
  @ApiParam({ name: 'groupId', type: 'string', description: 'Group ID' })
  @ApiParam({ name: 'memberId', type: 'string', description: 'Member user ID' })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
    type: GroupMember,
  })
  @ApiResponse({ status: 404, description: 'Group or member not found' })
  @ApiResponse({ status: 403, description: 'Access denied - Admin only' })
  @ApiResponse({ status: 400, description: 'Cannot demote last admin' })
  async updateMemberRole(
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @Body() body: { role: GroupRole },
    @Request() req: any,
  ): Promise<GroupMember> {
    return this.groupsService.updateMemberRole(
      groupId,
      memberId,
      body.role,
      req.user.id,
    );
  }

  @Post(':groupId/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave group' })
  @ApiParam({ name: 'groupId', type: 'string', description: 'Group ID' })
  @ApiResponse({ status: 204, description: 'Left group successfully' })
  @ApiResponse({ status: 404, description: 'Group not found or not a member' })
  @ApiResponse({ status: 400, description: 'Cannot leave as last admin' })
  async leaveGroup(
    @Param('groupId') groupId: string,
    @Request() req: any,
  ): Promise<void> {
    return this.groupsService.leaveGroup(groupId, req.user.id);
  }

  @Get(':groupId/stats')
  @ApiOperation({ summary: 'Get group statistics' })
  @ApiParam({ name: 'groupId', type: 'string', description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Group statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        memberCount: { type: 'number' },
        adminCount: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' },
        lastActivity: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 403, description: 'Access denied - Members only' })
  async getGroupStats(
    @Param('groupId') groupId: string,
    @Request() req: any,
  ): Promise<{
    memberCount: number;
    adminCount: number;
    createdAt: Date;
    lastActivity: Date;
  }> {
    return this.groupsService.getGroupStats(groupId, req.user.id);
  }
}
