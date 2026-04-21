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
	UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { SanctionsService } from '../services/sanctions.service';
import { CreateSanctionDto } from '../dto/create-sanction.dto';
import { QuerySanctionsDto } from '../dto/query-sanctions.dto';
import { SanctionResponseDto, SanctionStatsResponseDto } from '../dto/sanction-response.dto';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { RolesGuard } from '../../roles/roles.guard';
import { Roles } from '../../roles/roles.decorator';

@ApiTags('Sanctions')
@ApiBearerAuth()
@Controller('sanctions')
export class SanctionsController {
	constructor(private readonly sanctionsService: SanctionsService) {}

	@Post()
	@UseGuards(RolesGuard)
	@Roles('admin', 'moderator')
	@ApiOperation({ summary: 'Issue a sanction (admin/moderator only)' })
	@ApiBody({ type: CreateSanctionDto })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Sanction issued', type: SanctionResponseDto })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	async createSanction(
		@Body() dto: CreateSanctionDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		return this.sanctionsService.createSanction(dto, req.user.sub);
	}

	@Get()
	@UseGuards(RolesGuard)
	@Roles('admin', 'moderator')
	@ApiOperation({ summary: 'List sanctions with optional filters (admin/moderator only)' })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Filtered sanctions list',
		type: [SanctionResponseDto],
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async listAll(@Query() query: QuerySanctionsDto, @Request() req: ExpressRequest & { user: JwtPayload }) {
		return this.sanctionsService.findFiltered(req.user.sub, query);
	}

	@Get('stats')
	@UseGuards(RolesGuard)
	@Roles('admin', 'moderator')
	@ApiOperation({ summary: 'Get sanction counts by type (admin/moderator only)' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Stats retrieved', type: [SanctionStatsResponseDto] })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async getStats(@Request() req: ExpressRequest & { user: JwtPayload }) {
		return this.sanctionsService.getStats(req.user.sub);
	}

	@Get('me')
	@ApiOperation({ summary: 'Get my active sanctions' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Sanctions retrieved', type: [SanctionResponseDto] })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getMySanctions(@Request() req: ExpressRequest & { user: JwtPayload }) {
		return this.sanctionsService.getMySanctions(req.user.sub);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get sanction detail' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Sanction ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Sanction detail', type: SanctionResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Sanction not found' })
	async getSanction(@Param('id', ParseUUIDPipe) id: string) {
		return this.sanctionsService.getSanction(id);
	}

	@Put(':id/lift')
	@UseGuards(RolesGuard)
	@Roles('admin', 'moderator')
	@ApiOperation({ summary: 'Lift a sanction (admin/moderator only)' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Sanction ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Sanction lifted', type: SanctionResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
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
