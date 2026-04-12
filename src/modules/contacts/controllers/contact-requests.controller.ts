import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Param,
	Body,
	ParseUUIDPipe,
	HttpCode,
	HttpStatus,
	Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { ContactRequestsService } from '../services/contact-requests.service';
import { SendContactRequestDto } from '../dto/send-contact-request.dto';
import { ContactRequest } from '../entities/contact-request.entity';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';
import { assertOwnership } from '../../jwt-auth/ownership.util';

@ApiTags('Contact Requests')
@ApiBearerAuth()
@Controller('contact-requests')
export class ContactRequestsController {
	constructor(private readonly contactRequestsService: ContactRequestsService) {}

	@Post()
	@ApiOperation({ summary: 'Send a contact request' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Contact request sent successfully' })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot send request to yourself' })
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: 'Already contacts or pending request exists',
	})
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async sendRequest(
		@Request() req: ExpressRequest & { user: JwtPayload },
		@Body() dto: SendContactRequestDto
	): Promise<ContactRequest> {
		return this.contactRequestsService.sendRequest(req.user.sub, dto.contactId);
	}

	@Get(':userId')
	@ApiOperation({ summary: 'Get all contact requests for a user (incoming + outgoing)' })
	@ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Contact requests retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	@ApiResponse({
		status: HttpStatus.FORBIDDEN,
		description: "Cannot access another user's contact requests",
	})
	async getRequests(
		@Param('userId', ParseUUIDPipe) userId: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<ContactRequest[]> {
		assertOwnership(req, userId, "Cannot access another user's contact requests");
		return this.contactRequestsService.getRequestsForUser(userId);
	}

	@Patch(':requestId/accept')
	@ApiOperation({ summary: 'Accept a contact request' })
	@ApiParam({ name: 'requestId', type: 'string', format: 'uuid', description: 'Request ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Contact request accepted' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact request not found' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only the recipient can accept' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Request is not pending' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async acceptRequest(
		@Request() req: ExpressRequest & { user: JwtPayload },
		@Param('requestId', ParseUUIDPipe) requestId: string
	): Promise<ContactRequest> {
		return this.contactRequestsService.acceptRequest(requestId, req.user.sub);
	}

	@Patch(':requestId/reject')
	@ApiOperation({ summary: 'Reject a contact request' })
	@ApiParam({ name: 'requestId', type: 'string', format: 'uuid', description: 'Request ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Contact request rejected' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact request not found' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only the recipient can reject' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Request is not pending' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async rejectRequest(
		@Request() req: ExpressRequest & { user: JwtPayload },
		@Param('requestId', ParseUUIDPipe) requestId: string
	): Promise<ContactRequest> {
		return this.contactRequestsService.rejectRequest(requestId, req.user.sub);
	}

	@Delete(':requestId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Cancel a sent contact request' })
	@ApiParam({ name: 'requestId', type: 'string', format: 'uuid', description: 'Request ID' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Contact request cancelled' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact request not found' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only the requester can cancel' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Request is not pending' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async cancelRequest(
		@Request() req: ExpressRequest & { user: JwtPayload },
		@Param('requestId', ParseUUIDPipe) requestId: string
	): Promise<void> {
		return this.contactRequestsService.cancelRequest(requestId, req.user.sub);
	}
}
