import { Controller, Get, Param, ParseUUIDPipe, HttpStatus, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ReputationService } from '../services/reputation.service';
import { ReputationResponseDto } from '../dto/reputation-response.dto';
import { RolesService } from '../../roles/services/roles.service';
import { RolesGuard } from '../../roles/roles.guard';
import { Roles } from '../../roles/roles.decorator';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

@ApiTags('Reputation')
@ApiBearerAuth()
@Controller('reputation')
export class ReputationController {
	constructor(
		private readonly reputationService: ReputationService,
		private readonly rolesService: RolesService
	) {}

	@Get('me')
	@ApiOperation({ summary: 'Get my reputation score' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Reputation retrieved', type: ReputationResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getMyReputation(@Request() req: ExpressRequest & { user: JwtPayload }) {
		return this.reputationService.getReputation(req.user.sub);
	}

	@Get(':userId')
	@UseGuards(RolesGuard)
	@Roles('admin', 'moderator')
	@ApiOperation({ summary: 'Get a user reputation (admin/moderator only)' })
	@ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'Target user ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Reputation retrieved', type: ReputationResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async getUserReputation(
		@Param('userId', ParseUUIDPipe) userId: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		await this.rolesService.ensureAdminOrModerator(req.user.sub);
		return this.reputationService.getReputation(userId);
	}
}
