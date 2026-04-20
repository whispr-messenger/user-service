import {
	Body,
	Controller,
	Delete,
	ForbiddenException,
	HttpStatus,
	Logger,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { AccountsService } from '../services/accounts.service';
import { UserRegisteredEvent } from '../../shared/events';
import { Public } from '../../jwt-auth/public.decorator';
import { IsString, IsUUID } from 'class-validator';
import type { Request as ExpressRequest } from 'express';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { assertOwnership } from '../../jwt-auth/ownership.util';

class BootstrapAccountDto {
	@IsUUID()
	userId: string;

	@IsString()
	phoneNumber: string;
}

/**
 * AccountsController - Manages core user identity and lifecycle endpoints
 *
 * Handles:
 * - User listing and retrieval
 * - Activity tracking (last seen)
 * - Account status (activation, deactivation)
 * - Account deletion
 *
 * Profile management is handled by ProfileController
 */
@ApiTags('Accounts')
@ApiBearerAuth()
@Controller('account')
export class AccountsController {
	private readonly logger = new Logger(AccountsController.name);

	constructor(private readonly accountsService: AccountsService) {}

	@Post('bootstrap')
	@Public()
	@ApiOperation({
		summary: 'Bootstrap a user account (dev-only)',
		description:
			'Creates the minimal user record when projections are not yet wired (development helper).',
	})
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Account created or already exists' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden in production' })
	async bootstrap(@Body() dto: BootstrapAccountDto): Promise<void> {
		if (process.env.NODE_ENV === 'production') {
			throw new ForbiddenException();
		}
		await this.accountsService.createFromEvent(new UserRegisteredEvent(dto.userId, dto.phoneNumber));
	}

	@Patch(':id/last-seen')
	@ApiOperation({
		summary: 'Update user last seen timestamp',
		description: 'Records the current timestamp as the last time the user was active.',
	})
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Last seen updated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async updateLastSeen(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<void> {
		assertOwnership(req, id);
		return this.accountsService.updateLastSeen(id);
	}

	@Patch(':id/deactivate')
	@ApiOperation({
		summary: 'Deactivate user account',
		description: 'Marks the user account as inactive. The user will no longer appear in search results.',
	})
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'User deactivated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async deactivate(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<void> {
		assertOwnership(req, id);
		return this.accountsService.deactivate(id);
	}

	@Patch(':id/activate')
	@ApiOperation({
		summary: 'Activate user account',
		description: 'Restores an inactive user account to active status.',
	})
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'User activated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async activate(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<void> {
		assertOwnership(req, id);
		return this.accountsService.activate(id);
	}

	@Delete(':id')
	@ApiOperation({
		summary: 'Soft delete user account',
		description:
			'Soft-deletes the user record. The data is retained but the account is no longer accessible.',
	})
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'User deleted successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<void> {
		assertOwnership(req, id);
		return this.accountsService.remove(id);
	}
}
