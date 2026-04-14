import { Controller, Get, Put, Param, Body, ParseUUIDPipe, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from '../services/roles.service';
import { SetRoleDto } from '../dto/set-role.dto';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
	constructor(private readonly rolesService: RolesService) {}

	@Get('me')
	@ApiOperation({ summary: 'Get my role' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Role retrieved' })
	async getMyRole(@Request() req: ExpressRequest & { user: JwtPayload }) {
		return this.rolesService.getMyRole(req.user.sub);
	}

	@Put(':userId')
	@ApiOperation({ summary: 'Set user role (admin only)' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Role updated' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	async setRole(
		@Param('userId', ParseUUIDPipe) userId: string,
		@Body() dto: SetRoleDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		return this.rolesService.setRole(userId, dto, req.user.sub);
	}
}
