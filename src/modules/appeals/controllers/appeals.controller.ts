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
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBearerAuth,
	ApiQuery,
	ApiParam,
	ApiBody,
} from '@nestjs/swagger';
import { AppealsService } from '../services/appeals.service';
import { CreateAppealDto } from '../dto/create-appeal.dto';
import { ReviewAppealDto } from '../dto/review-appeal.dto';
import { QueryAppealsDto } from '../dto/query-appeals.dto';
import {
	AppealResponseDto,
	AppealStatsResponseDto,
	AppealTimelineResponseDto,
} from '../dto/appeal-response.dto';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

@ApiTags('Appeals')
@ApiBearerAuth()
@Controller('appeals')
export class AppealsController {
	constructor(private readonly appealsService: AppealsService) {}

	@Post()
	@ApiOperation({ summary: 'Create an appeal for a sanction' })
	@ApiBody({ type: CreateAppealDto })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Appeal created', type: AppealResponseDto })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Max active appeals reached' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Appeal already exists or sanction inactive' })
	async createAppeal(@Body() dto: CreateAppealDto, @Request() req: ExpressRequest & { user: JwtPayload }) {
		return this.appealsService.createAppeal(dto, req.user.sub);
	}

	@Get()
	@ApiOperation({ summary: 'Get my appeals' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Appeals retrieved', type: [AppealResponseDto] })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getMyAppeals(@Request() req: ExpressRequest & { user: JwtPayload }) {
		return this.appealsService.getMyAppeals(req.user.sub);
	}

	@Get('queue')
	@ApiOperation({ summary: 'Get pending appeal queue (admin/moderator only)' })
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
		description: 'Number of results to return (default: 50)',
	})
	@ApiQuery({
		name: 'offset',
		required: false,
		type: Number,
		description: 'Number of results to skip (default: 0)',
	})
	@ApiResponse({ status: HttpStatus.OK, description: 'Queue retrieved', type: [AppealResponseDto] })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async getAppealQueue(
		@Query('limit') limit: string,
		@Query('offset') offset: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		return this.appealsService.getAppealQueue(
			req.user.sub,
			limit ? parseInt(limit) : 50,
			offset ? parseInt(offset) : 0
		);
	}

	@Get('search')
	@ApiOperation({ summary: 'Search appeals with filters (admin/moderator only)' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Appeals retrieved', type: [AppealResponseDto] })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async searchAppeals(
		@Query() query: QueryAppealsDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		return this.appealsService.findFiltered(req.user.sub, query);
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get appeal counts by status (admin/moderator only)' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Stats retrieved', type: [AppealStatsResponseDto] })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async getStats(@Request() req: ExpressRequest & { user: JwtPayload }) {
		return this.appealsService.getStats(req.user.sub);
	}

	@Get(':id/timeline')
	@ApiOperation({ summary: 'Get appeal timeline with events' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Appeal ID' })
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Timeline retrieved',
		type: AppealTimelineResponseDto,
	})
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Appeal not found' })
	async getTimeline(@Param('id', ParseUUIDPipe) id: string) {
		return this.appealsService.getTimeline(id);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get appeal detail' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Appeal ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Appeal detail', type: AppealResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Appeal not found' })
	async getAppeal(@Param('id', ParseUUIDPipe) id: string) {
		return this.appealsService.getAppeal(id);
	}

	@Put(':id/review')
	@ApiOperation({ summary: 'Review an appeal (admin/moderator only)' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Appeal ID' })
	@ApiBody({ type: ReviewAppealDto })
	@ApiResponse({ status: HttpStatus.OK, description: 'Appeal reviewed', type: AppealResponseDto })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Appeal not found' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Appeal already resolved' })
	async reviewAppeal(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: ReviewAppealDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		return this.appealsService.reviewAppeal(id, req.user.sub, dto);
	}
}
