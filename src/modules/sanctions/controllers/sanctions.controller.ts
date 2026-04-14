import {
	Controller,
	Get,
	Post,
	Put,
	Param,
	Body,
	Query,
	ParseUUIDPipe,
	HttpStatus,
	Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SanctionsService } from '../services/sanctions.service';
import { CreateSanctionDto } from '../dto/create-sanction.dto';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

@ApiTags('Sanctions')
@ApiBearerAuth()
@Controller('sanctions')
export class SanctionsController {
	constructor(private readonly sanctionsService: SanctionsService) {}

	@Post()
	@ApiOperation({ summary: 'Issue a sanction (admin/moderator only)' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Sanction issued' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	async createSanction(
		@Body() dto: CreateSanctionDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		return this.sanctionsService.createSanction(dto, req.user.sub);
	}

	@Get()
	@ApiOperation({ summary: 'List all active sanctions (admin/moderator only)' })
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'offset', required: false, type: Number })
	async listAll(
		@Query('limit') limit: string,
		@Query('offset') offset: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		return this.sanctionsService.listAllActive(
			req.user.sub,
			limit ? parseInt(limit) : 50,
			offset ? parseInt(offset) : 0
		);
	}

	@Get('me')
	@ApiOperation({ summary: 'Get my active sanctions' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Sanctions retrieved' })
	async getMySanctions(@Request() req: ExpressRequest & { user: JwtPayload }) {
		return this.sanctionsService.getMySanctions(req.user.sub);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get sanction detail' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Sanction detail' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Sanction not found' })
	async getSanction(@Param('id', ParseUUIDPipe) id: string) {
		return this.sanctionsService.getSanction(id);
	}

	@Put(':id/lift')
	@ApiOperation({ summary: 'Lift a sanction (admin/moderator only)' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Sanction lifted' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Sanction not found' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Already lifted' })
	async liftSanction(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		return this.sanctionsService.liftSanction(id, req.user.sub);
	}
}
