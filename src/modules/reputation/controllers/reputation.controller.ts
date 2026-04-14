import { Controller, Get, Param, ParseUUIDPipe, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReputationService } from '../services/reputation.service';
import { RolesService } from '../../roles/services/roles.service';
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
	@ApiResponse({ status: HttpStatus.OK, description: 'Reputation retrieved' })
	async getMyReputation(@Request() req: ExpressRequest & { user: JwtPayload }) {
		return this.reputationService.getReputation(req.user.sub);
	}

	@Get(':userId')
	@ApiOperation({ summary: 'Get a user reputation (admin/moderator only)' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Reputation retrieved' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async getUserReputation(
		@Param('userId', ParseUUIDPipe) userId: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		await this.rolesService.ensureAdminOrModerator(req.user.sub);
		return this.reputationService.getReputation(userId);
	}
}
