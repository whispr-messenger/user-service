import { Controller, Patch, Param, Delete, ParseUUIDPipe, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { AccountsService } from '../services/accounts.service';
import { UserRegisteredRetryService } from '../services/user-registered-retry.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_REGISTERED_PATTERN, type UserRegisteredEvent } from '../../shared/events';

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

	constructor(
		private readonly accountsService: AccountsService,
		private readonly userRegisteredRetryService: UserRegisteredRetryService
	) {}

	/**
	 * Handles user.registered event from auth-service
	 * Creates a minimal user record in the users schema
	 * This allows the auth module to create users without depending on the users module
	 */
	@MessagePattern(USER_REGISTERED_PATTERN)
	async createUserAccount(@Payload() event: UserRegisteredEvent): Promise<void> {
		this.logger.log(`Received ${USER_REGISTERED_PATTERN} event for user ${event.userId}`);
		await this.userRegisteredRetryService.handleWithRetry(event);
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
	async updateLastSeen(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
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
	async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
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
	async activate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
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
	async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
		return this.accountsService.remove(id);
	}
}
