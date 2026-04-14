import {
	Controller,
	Get,
	Post,
	Delete,
	Param,
	Body,
	ParseUUIDPipe,
	HttpStatus,
	HttpCode,
	Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { WebhooksService } from '../services/webhooks.service';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { RolesService } from '../../roles/services/roles.service';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
	constructor(
		private readonly webhooksService: WebhooksService,
		private readonly rolesService: RolesService
	) {}

	@Post()
	@ApiOperation({ summary: 'Register a webhook (admin only)' })
	@ApiBody({ type: CreateWebhookDto })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Webhook registered' })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async register(@Body() dto: CreateWebhookDto, @Request() req: ExpressRequest & { user: JwtPayload }) {
		await this.rolesService.ensureAdminOrModerator(req.user.sub);
		return this.webhooksService.register(dto, req.user.sub);
	}

	@Get()
	@ApiOperation({ summary: 'List all webhooks (admin only)' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Webhooks listed' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async list(@Request() req: ExpressRequest & { user: JwtPayload }) {
		await this.rolesService.ensureAdminOrModerator(req.user.sub);
		return this.webhooksService.list();
	}

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Delete a webhook (admin only)' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Webhook ID' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Webhook deleted' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Webhook not found' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required' })
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	) {
		await this.rolesService.ensureAdminOrModerator(req.user.sub);
		return this.webhooksService.remove(id);
	}
}
