import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Param,
	Body,
	ParseUUIDPipe,
	HttpCode,
	HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from '../services/groups.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { AddGroupMemberDto } from '../dto/add-group-member.dto';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';
import { Group } from '../entities/group.entity';
import { GroupMember } from '../entities/group-member.entity';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
	constructor(private readonly groupsService: GroupsService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new group' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Group created successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Creator user not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async createGroup(@Body() dto: CreateGroupDto): Promise<Group> {
		return this.groupsService.createGroup(dto);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get group by ID' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Group ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Group retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getGroup(@Param('id', ParseUUIDPipe) id: string): Promise<Group> {
		return this.groupsService.getGroup(id);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update group details' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Group ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Group updated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async updateGroup(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGroupDto): Promise<Group> {
		return this.groupsService.updateGroup(id, dto);
	}

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Delete a group' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Group ID' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Group deleted successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async deleteGroup(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
		return this.groupsService.deleteGroup(id);
	}

	@Post(':id/members')
	@ApiOperation({ summary: 'Add a member to a group' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Group ID' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Member added successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group or user not found' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'User is already a member' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async addMember(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: AddGroupMemberDto
	): Promise<GroupMember> {
		return this.groupsService.addMember(id, dto);
	}

	@Delete(':id/members/:userId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Remove a member from a group' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Group ID' })
	@ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'User ID to remove' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Member removed successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group or member not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async removeMember(
		@Param('id', ParseUUIDPipe) id: string,
		@Param('userId', ParseUUIDPipe) userId: string
	): Promise<void> {
		return this.groupsService.removeMember(id, userId);
	}

	@Patch(':id/members/:userId/role')
	@ApiOperation({ summary: 'Update a member role in a group' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Group ID' })
	@ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Member role updated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group or member not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async updateMemberRole(
		@Param('id', ParseUUIDPipe) id: string,
		@Param('userId', ParseUUIDPipe) userId: string,
		@Body() dto: UpdateMemberRoleDto
	): Promise<GroupMember> {
		return this.groupsService.updateMemberRole(id, userId, dto);
	}
}
