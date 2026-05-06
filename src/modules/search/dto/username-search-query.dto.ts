import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UsernameSearchQueryDto {
	@ApiProperty({ description: 'Username to search', example: 'alice' })
	@IsString()
	@IsNotEmpty()
	@MinLength(1)
	@MaxLength(64)
	username: string;
}
