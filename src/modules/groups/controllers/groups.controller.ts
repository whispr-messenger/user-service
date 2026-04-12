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

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
	constructor(private readonly groupsService: GroupsService) {}

	@Get()
	@ApiOperation({ summary: 'Get all groups for the authenticated user' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Groups retrieved successfully' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getGroups(@Request() req: ExpressRequest & { user: JwtPayload }): Promise<Group[]> {
		return this.groupsService.getGroups(req.user.sub);
	}

	@Post()
	@ApiOperation({ summary: 'Create a group for the authenticated user' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Group created successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async createGroup(
		@Body() dto: CreateGroupDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<Group> {
		return this.groupsService.createGroup(req.user.sub, dto);
	}

	@Patch(':groupId')
	@ApiOperation({ summary: 'Update a group' })
	@ApiParam({ name: 'groupId', type: 'string', format: 'uuid', description: 'Group ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Group updated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User or group not found' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'You do not own this group' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async updateGroup(
		@Param('groupId', ParseUUIDPipe) groupId: string,
		@Body() dto: UpdateGroupDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<Group> {
		return this.groupsService.updateGroup(req.user.sub, groupId, dto);
	}

	@Delete(':groupId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Delete a group' })
	@ApiParam({ name: 'groupId', type: 'string', format: 'uuid', description: 'Group ID' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Group deleted successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User or group not found' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'You do not own this group' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async deleteGroup(
		@Param('groupId', ParseUUIDPipe) groupId: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<void> {
		return this.groupsService.deleteGroup(req.user.sub, groupId);
	}
}
