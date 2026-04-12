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
	Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from '../services/groups.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { Group } from '../entities/group.entity';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { assertOwnership } from '../../jwt-auth/ownership.util';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
	constructor(private readonly groupsService: GroupsService) {}

	@Get(':ownerId')
	@ApiOperation({ summary: 'Get all groups for a user' })
	@ApiParam({ name: 'ownerId', type: 'string', format: 'uuid', description: 'Owner user ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Groups retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	async getGroups(
		@Param('ownerId', ParseUUIDPipe) ownerId: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<Group[]> {
		assertOwnership(req, ownerId);
		return this.groupsService.getGroups(ownerId);
	}

	@Post(':ownerId')
	@ApiOperation({ summary: 'Create a group for a user' })
	@ApiParam({ name: 'ownerId', type: 'string', format: 'uuid', description: 'Owner user ID' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Group created successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	async createGroup(
		@Param('ownerId', ParseUUIDPipe) ownerId: string,
		@Body() dto: CreateGroupDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<Group> {
		assertOwnership(req, ownerId);
		return this.groupsService.createGroup(ownerId, dto);
	}

	@Patch(':ownerId/:groupId')
	@ApiOperation({ summary: 'Update a group' })
	@ApiParam({ name: 'ownerId', type: 'string', format: 'uuid', description: 'Owner user ID' })
	@ApiParam({ name: 'groupId', type: 'string', format: 'uuid', description: 'Group ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Group updated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User or group not found' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'You do not own this group' })
	async updateGroup(
		@Param('ownerId', ParseUUIDPipe) ownerId: string,
		@Param('groupId', ParseUUIDPipe) groupId: string,
		@Body() dto: UpdateGroupDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<Group> {
		assertOwnership(req, ownerId);
		return this.groupsService.updateGroup(ownerId, groupId, dto);
	}

	@Delete(':ownerId/:groupId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Delete a group' })
	@ApiParam({ name: 'ownerId', type: 'string', format: 'uuid', description: 'Owner user ID' })
	@ApiParam({ name: 'groupId', type: 'string', format: 'uuid', description: 'Group ID' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Group deleted successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User or group not found' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'You do not own this group' })
	async deleteGroup(
		@Param('ownerId', ParseUUIDPipe) ownerId: string,
		@Param('groupId', ParseUUIDPipe) groupId: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<void> {
		assertOwnership(req, ownerId);
		return this.groupsService.deleteGroup(ownerId, groupId);
	}
}
