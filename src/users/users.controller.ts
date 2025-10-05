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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from '../dto';
import { User } from '../entities';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Phone number or username already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
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
    description: 'Users retrieved successfully',
  })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ): Promise<{ users: User[]; total: number }> {
    return this.usersService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Get('phone/:phoneNumber')
  @ApiOperation({ summary: 'Get user by phone number' })
  @ApiParam({
    name: 'phoneNumber',
    type: 'string',
    description: 'Phone number in E.164 format',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async findByPhoneNumber(
    @Param('phoneNumber') phoneNumber: string,
  ): Promise<User | null> {
    return this.usersService.findByPhoneNumber(phoneNumber);
  }

  @Get('username/:username')
  @ApiOperation({ summary: 'Get user by username' })
  @ApiParam({
    name: 'username',
    type: 'string',
    description: 'Username',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async findByUsername(
    @Param('username') username: string,
  ): Promise<User | null> {
    return this.usersService.findByUsername(username);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Username already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/last-seen')
  @ApiOperation({ summary: 'Update user last seen timestamp' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Last seen updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async updateLastSeen(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.updateLastSeen(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deactivated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate user account' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User activated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.activate(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete user' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
