import {
	Controller,
	Get,
	Put,
	Param,
	Body,
	ParseUUIDPipe,
	HttpStatus,
	Request,
	UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { RolesService } from '../services/roles.service';
import { SetRoleDto } from '../dto/set-role.dto';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
	constructor(private readonly rolesService: RolesService) {}

	@Get('me')
	@ApiOperation({ summary: 'Get my role' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Role retrieved' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getMyRole(@Request() req: ExpressRequest & { user: JwtPayload }) {
		return this.rolesService.getMyRole(req.user.sub);
	}

	@Put(':userId')
	@UseGuards(RolesGuard)
	@Roles('admin')
	@ApiOperation({ summary: 'Set user role (admin only)' })
	@ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'Target user ID' })
	@ApiBody({ type: SetRoleDto })
	@ApiResponse({ status: HttpStatus.OK, description: 'Role updated' })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
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
