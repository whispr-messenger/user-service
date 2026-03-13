import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGroupDto {
	@ApiPropertyOptional({ description: 'Group name', maxLength: 100 })
	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(100)
	name?: string;

	@ApiPropertyOptional({ description: 'Group description', maxLength: 500 })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	description?: string;
}
