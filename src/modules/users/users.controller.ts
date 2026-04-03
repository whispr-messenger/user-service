import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from '../../dto/create-user.dto';
import { User } from '../../entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.createUser(createUserDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(+id);
  }
}
