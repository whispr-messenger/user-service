import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Param,
	Body,
	Query,
	ParseUUIDPipe,
	HttpCode,
	HttpStatus,
	Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest } from 'express';
import { ContactsService } from '../services/contacts.service';
import { AddContactDto } from '../dto/add-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { Contact } from '../entities/contact.entity';
import { CursorPaginationDto, CursorPaginatedResult } from '../../common/dto/cursor-pagination.dto';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
	constructor(private readonly contactsService: ContactsService) {}

	@Get()
	@ApiOperation({ summary: 'Get paginated contacts for the authenticated user' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Contacts retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async getContacts(
		@Query() pagination: CursorPaginationDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<CursorPaginatedResult<Contact>> {
		return this.contactsService.getContacts(req.user.sub, pagination.limit, pagination.cursor);
	}

	@Post()
	@Throttle({
		short: { ttl: 1000, limit: 5 },
		medium: { ttl: 10_000, limit: 15 },
		long: { ttl: 60_000, limit: 20 },
	})
	@ApiOperation({ summary: 'Add a contact for the authenticated user' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Contact added successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Contact already exists' })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot add yourself as a contact' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async addContact(
		@Body() dto: AddContactDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<Contact> {
		return this.contactsService.addContact(req.user.sub, dto);
	}

	@Patch(':contactId')
	@ApiOperation({ summary: 'Update a contact for the authenticated user' })
	@ApiParam({ name: 'contactId', type: 'string', format: 'uuid', description: 'Contact user ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Contact updated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User or contact not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async updateContact(
		@Param('contactId', ParseUUIDPipe) contactId: string,
		@Body() dto: UpdateContactDto,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<Contact> {
		return this.contactsService.updateContact(req.user.sub, contactId, dto);
	}

	@Delete(':contactId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Remove a contact for the authenticated user' })
	@ApiParam({ name: 'contactId', type: 'string', format: 'uuid', description: 'Contact user ID' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Contact removed successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User or contact not found' })
	@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid bearer token' })
	async removeContact(
		@Param('contactId', ParseUUIDPipe) contactId: string,
		@Request() req: ExpressRequest & { user: JwtPayload }
	): Promise<void> {
		return this.contactsService.removeContact(req.user.sub, contactId);
	}
}
