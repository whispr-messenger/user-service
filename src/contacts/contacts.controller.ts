import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseBoolPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { AddContactDto, UpdateContactDto } from '../dto';
import { Contact } from '../entities';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Add a new contact' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Contact added successfully',
    type: Contact,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Contact already exists',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contact user not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or blocked user',
  })
  async addContact(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() addContactDto: AddContactDto,
  ): Promise<Contact> {
    return this.contactsService.addContact(userId, addContactDto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user contacts with pagination' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'favorites',
    required: false,
    type: Boolean,
    description: 'Filter favorites only (default: false)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contacts retrieved successfully',
  })
  async getContacts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('favorites', new ParseBoolPipe({ optional: true }))
    favorites: boolean = false,
  ): Promise<{ contacts: Contact[]; total: number }> {
    return this.contactsService.getContacts(userId, page, limit, favorites);
  }

  @Get(':userId/search')
  @ApiOperation({ summary: 'Search contacts' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiQuery({
    name: 'q',
    type: 'string',
    description: 'Search query',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
  })
  async searchContacts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ): Promise<{ contacts: Contact[]; total: number }> {
    return this.contactsService.searchContacts(userId, query, page, limit);
  }

  @Get(':userId/favorites')
  @ApiOperation({ summary: 'Get favorite contacts' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Favorite contacts retrieved successfully',
  })
  async getFavoriteContacts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ): Promise<{ contacts: Contact[]; total: number }> {
    return this.contactsService.getFavoriteContacts(userId, page, limit);
  }

  @Get(':userId/count')
  @ApiOperation({ summary: 'Get contacts count' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contacts count retrieved successfully',
    schema: { type: 'number' },
  })
  async getContactsCount(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<number> {
    return this.contactsService.getContactsCount(userId);
  }

  @Get(':userId/mutual/:otherUserId')
  @ApiOperation({ summary: 'Get mutual contacts between two users' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'First user ID',
  })
  @ApiParam({
    name: 'otherUserId',
    type: 'string',
    format: 'uuid',
    description: 'Second user ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mutual contacts retrieved successfully',
  })
  async getMutualContacts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('otherUserId', ParseUUIDPipe) otherUserId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ): Promise<{ contacts: Contact[]; total: number }> {
    return this.contactsService.getMutualContacts(
      userId,
      otherUserId,
      page,
      limit,
    );
  }

  @Get(':userId/:contactId')
  @ApiOperation({ summary: 'Get specific contact' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiParam({
    name: 'contactId',
    type: 'string',
    format: 'uuid',
    description: 'Contact user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contact retrieved successfully',
    type: Contact,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contact not found',
  })
  async getContact(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ): Promise<Contact> {
    return this.contactsService.getContact(userId, contactId);
  }

  @Patch(':userId/:contactId')
  @ApiOperation({ summary: 'Update contact' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiParam({
    name: 'contactId',
    type: 'string',
    format: 'uuid',
    description: 'Contact user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contact updated successfully',
    type: Contact,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contact not found',
  })
  async updateContact(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() updateContactDto: UpdateContactDto,
  ): Promise<Contact> {
    return this.contactsService.updateContact(
      userId,
      contactId,
      updateContactDto,
    );
  }

  @Patch(':userId/:contactId/toggle-favorite')
  @ApiOperation({ summary: 'Toggle contact favorite status' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiParam({
    name: 'contactId',
    type: 'string',
    format: 'uuid',
    description: 'Contact user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contact favorite status toggled successfully',
    type: Contact,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contact not found',
  })
  async toggleFavorite(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ): Promise<Contact> {
    return this.contactsService.toggleFavorite(userId, contactId);
  }

  @Delete(':userId/:contactId')
  @ApiOperation({ summary: 'Remove contact' })
  @ApiParam({
    name: 'userId',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiParam({
    name: 'contactId',
    type: 'string',
    format: 'uuid',
    description: 'Contact user ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contact removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contact not found',
  })
  async removeContact(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ): Promise<void> {
    return this.contactsService.removeContact(userId, contactId);
  }
}
