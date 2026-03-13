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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from '../services/contacts.service';
import { AddContactDto } from '../dto/add-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { Contact } from '../entities/contact.entity';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
	constructor(private readonly contactsService: ContactsService) {}

	@Get(':ownerId')
	@ApiOperation({ summary: 'Get all contacts for a user' })
	@ApiParam({ name: 'ownerId', type: 'string', format: 'uuid', description: 'Owner user ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Contacts retrieved successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	async getContacts(@Param('ownerId', ParseUUIDPipe) ownerId: string): Promise<Contact[]> {
		return this.contactsService.getContacts(ownerId);
	}

	@Post(':ownerId')
	@ApiOperation({ summary: 'Add a contact for a user' })
	@ApiParam({ name: 'ownerId', type: 'string', format: 'uuid', description: 'Owner user ID' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Contact added successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Contact already exists' })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot add yourself as a contact' })
	async addContact(
		@Param('ownerId', ParseUUIDPipe) ownerId: string,
		@Body() dto: AddContactDto
	): Promise<Contact> {
		return this.contactsService.addContact(ownerId, dto);
	}

	@Patch(':ownerId/:contactId')
	@ApiOperation({ summary: 'Update a contact (e.g. nickname)' })
	@ApiParam({ name: 'ownerId', type: 'string', format: 'uuid', description: 'Owner user ID' })
	@ApiParam({ name: 'contactId', type: 'string', format: 'uuid', description: 'Contact user ID' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Contact updated successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User or contact not found' })
	async updateContact(
		@Param('ownerId', ParseUUIDPipe) ownerId: string,
		@Param('contactId', ParseUUIDPipe) contactId: string,
		@Body() dto: UpdateContactDto
	): Promise<Contact> {
		return this.contactsService.updateContact(ownerId, contactId, dto);
	}

	@Delete(':ownerId/:contactId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Remove a contact for a user' })
	@ApiParam({ name: 'ownerId', type: 'string', format: 'uuid', description: 'Owner user ID' })
	@ApiParam({ name: 'contactId', type: 'string', format: 'uuid', description: 'Contact user ID' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Contact removed successfully' })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User or contact not found' })
	async removeContact(
		@Param('ownerId', ParseUUIDPipe) ownerId: string,
		@Param('contactId', ParseUUIDPipe) contactId: string
	): Promise<void> {
		return this.contactsService.removeContact(ownerId, contactId);
	}
}
