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
import { ContactRequestsService } from '../services/contact-requests.service';
import { SendContactRequestDto } from '../dto/send-contact-request.dto';
import { ContactRequest } from '../entities/contact-request.entity';

@ApiTags('Contact Requests')
@ApiBearerAuth()
@Controller('contact-requests')
export class ContactRequestsController {
	constructor(private readonly contactRequestsService: ContactRequestsService) {}

	@Post()
	@ApiOperation({ summary: 'Send a contact request' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Contact request sent successfully' })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot send request to yourself' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Already contacts or pending request exists' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	async sendRequest(@Request() req: any, @Body() dto: SendContactRequestDto): Promise<ContactRequest> {
		const requesterId = req.user.sub ?? req.user.id;
		return this.contactRequestsService.sendRequest(requesterId, dto.contactId);
	}

	@Get(':userId')
	@ApiOperation({ summary: 'Get all contact requests for a user (incoming + outgoing)' })
	@ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Contact requests retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	async getRequests(@Param('userId', ParseUUIDPipe) userId: string): Promise<ContactRequest[]> {
		return this.contactRequestsService.getRequestsForUser(userId);
	}

	@Patch(':requestId/accept')
	@ApiOperation({ summary: 'Accept a contact request' })
	@ApiParam({ name: 'requestId', type: 'string', format: 'uuid', description: 'Request ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Contact request accepted' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact request not found' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only the recipient can accept' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Request is not pending' })
	async acceptRequest(
		@Request() req: any,
		@Param('requestId', ParseUUIDPipe) requestId: string
	): Promise<ContactRequest> {
		const userId = req.user.sub ?? req.user.id;
		return this.contactRequestsService.acceptRequest(requestId, userId);
	}

	@Patch(':requestId/reject')
	@ApiOperation({ summary: 'Reject a contact request' })
	@ApiParam({ name: 'requestId', type: 'string', format: 'uuid', description: 'Request ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Contact request rejected' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact request not found' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only the recipient can reject' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Request is not pending' })
	async rejectRequest(
		@Request() req: any,
		@Param('requestId', ParseUUIDPipe) requestId: string
	): Promise<ContactRequest> {
		const userId = req.user.sub ?? req.user.id;
		return this.contactRequestsService.rejectRequest(requestId, userId);
	}

	@Delete(':requestId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Cancel a sent contact request' })
	@ApiParam({ name: 'requestId', type: 'string', format: 'uuid', description: 'Request ID' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Contact request cancelled' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact request not found' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Only the requester can cancel' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Request is not pending' })
	async cancelRequest(
		@Request() req: any,
		@Param('requestId', ParseUUIDPipe) requestId: string
	): Promise<void> {
		const userId = req.user.sub ?? req.user.id;
		return this.contactRequestsService.cancelRequest(requestId, userId);
	}
}
