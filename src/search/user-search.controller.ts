import {
  Controller,
  Get,
  Query,
  Post,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import {
  UserSearchService,
  UserSearchResult,
  SearchOptions,
} from './user-search.service';

@ApiTags('User Search')
@Controller('search')
export class UserSearchController {
  constructor(private readonly userSearchService: UserSearchService) {}

  @Get('phone')
  @ApiOperation({ summary: 'Search user by phone number' })
  @ApiQuery({ name: 'phoneNumber', description: 'Phone number to search for' })
  @ApiQuery({
    name: 'viewerId',
    description: 'ID of the user performing the search',
    required: false,
  })
  @ApiQuery({
    name: 'includeInactive',
    description: 'Include inactive users in search',
    required: false,
    type: Boolean,
  })
  @ApiOkResponse({
    description: 'User found',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        phoneNumber: { type: 'string', nullable: true },
        username: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        profilePictureUrl: { type: 'string', nullable: true },
        isActive: { type: 'boolean' },
        canViewProfile: { type: 'boolean' },
        canViewPhoneNumber: { type: 'boolean' },
        canViewFirstName: { type: 'boolean' },
        canViewLastName: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async searchByPhoneNumber(
    @Query('phoneNumber') phoneNumber: string,
    @Query('viewerId') viewerId?: string,
    @Query('includeInactive', new DefaultValuePipe(false))
    includeInactive?: boolean,
  ): Promise<UserSearchResult | null> {
    const options: SearchOptions = {
      viewerId,
      includeInactive,
    };

    return await this.userSearchService.searchByPhoneNumber(
      phoneNumber,
      options,
    );
  }

  @Get('username')
  @ApiOperation({ summary: 'Search user by username' })
  @ApiQuery({ name: 'username', description: 'Username to search for' })
  @ApiQuery({
    name: 'viewerId',
    description: 'ID of the user performing the search',
    required: false,
  })
  @ApiQuery({
    name: 'includeInactive',
    description: 'Include inactive users in search',
    required: false,
    type: Boolean,
  })
  @ApiOkResponse({
    description: 'User found',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        phoneNumber: { type: 'string', nullable: true },
        username: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        profilePictureUrl: { type: 'string', nullable: true },
        isActive: { type: 'boolean' },
        canViewProfile: { type: 'boolean' },
        canViewPhoneNumber: { type: 'boolean' },
        canViewFirstName: { type: 'boolean' },
        canViewLastName: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async searchByUsername(
    @Query('username') username: string,
    @Query('viewerId') viewerId?: string,
    @Query('includeInactive', new DefaultValuePipe(false))
    includeInactive?: boolean,
  ): Promise<UserSearchResult | null> {
    const options: SearchOptions = {
      viewerId,
      includeInactive,
    };

    return await this.userSearchService.searchByUsername(username, options);
  }

  @Get('name')
  @ApiOperation({
    summary: 'Search users by name (first name, last name, or full name)',
  })
  @ApiQuery({ name: 'query', description: 'Name query to search for' })
  @ApiQuery({
    name: 'viewerId',
    description: 'ID of the user performing the search',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results to return',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of results to skip',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'includeInactive',
    description: 'Include inactive users in search',
    required: false,
    type: Boolean,
  })
  @ApiOkResponse({
    description: 'Users found',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          phoneNumber: { type: 'string', nullable: true },
          username: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          profilePictureUrl: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          canViewProfile: { type: 'boolean' },
          canViewPhoneNumber: { type: 'boolean' },
          canViewFirstName: { type: 'boolean' },
          canViewLastName: { type: 'boolean' },
        },
      },
    },
  })
  async searchByName(
    @Query('query') query: string,
    @Query('viewerId') viewerId?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    @Query('includeInactive', new DefaultValuePipe(false))
    includeInactive?: boolean,
  ): Promise<UserSearchResult[]> {
    const options: SearchOptions = {
      viewerId,
      limit,
      offset,
      includeInactive,
    };

    return await this.userSearchService.searchByName(query, options);
  }

  @Get('advanced')
  @ApiOperation({ summary: 'Advanced search with multiple criteria' })
  @ApiQuery({
    name: 'phoneNumber',
    description: 'Phone number to search for',
    required: false,
  })
  @ApiQuery({
    name: 'username',
    description: 'Username to search for',
    required: false,
  })
  @ApiQuery({
    name: 'firstName',
    description: 'First name to search for',
    required: false,
  })
  @ApiQuery({
    name: 'lastName',
    description: 'Last name to search for',
    required: false,
  })
  @ApiQuery({
    name: 'fullName',
    description: 'Full name to search for',
    required: false,
  })
  @ApiQuery({
    name: 'viewerId',
    description: 'ID of the user performing the search',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results to return',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of results to skip',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'includeInactive',
    description: 'Include inactive users in search',
    required: false,
    type: Boolean,
  })
  @ApiOkResponse({
    description: 'Users found',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          phoneNumber: { type: 'string', nullable: true },
          username: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          profilePictureUrl: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
          canViewProfile: { type: 'boolean' },
          canViewPhoneNumber: { type: 'boolean' },
          canViewFirstName: { type: 'boolean' },
          canViewLastName: { type: 'boolean' },
        },
      },
    },
  })
  async advancedSearch(
    @Query('phoneNumber') phoneNumber?: string,
    @Query('username') username?: string,
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
    @Query('fullName') fullName?: string,
    @Query('viewerId') viewerId?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    @Query('includeInactive', new DefaultValuePipe(false))
    includeInactive?: boolean,
  ): Promise<UserSearchResult[]> {
    const criteria = {
      phoneNumber,
      username,
      firstName,
      lastName,
      fullName,
    };

    const options: SearchOptions = {
      viewerId,
      limit,
      offset,
      includeInactive,
    };

    return await this.userSearchService.advancedSearch(criteria, options);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions based on partial input' })
  @ApiQuery({
    name: 'query',
    description: 'Partial query to get suggestions for',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of suggestions to return',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'includeInactive',
    description: 'Include inactive users in suggestions',
    required: false,
    type: Boolean,
  })
  @ApiOkResponse({
    description: 'Search suggestions',
    schema: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  })
  async getSearchSuggestions(
    @Query('query') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('includeInactive', new DefaultValuePipe(false))
    includeInactive?: boolean,
  ): Promise<string[]> {
    const options: SearchOptions = {
      limit,
      includeInactive,
    };

    return await this.userSearchService.getSearchSuggestions(query, options);
  }

  @Post('rebuild-indexes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rebuild search indexes',
    description:
      'Rebuilds all search indexes. This operation may take some time for large datasets.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search indexes rebuilt successfully',
  })
  @ApiResponse({ status: 500, description: 'Failed to rebuild search indexes' })
  async rebuildSearchIndexes(): Promise<{ message: string }> {
    await this.userSearchService.rebuildSearchIndexes();
    return { message: 'Search indexes rebuilt successfully' };
  }
}
