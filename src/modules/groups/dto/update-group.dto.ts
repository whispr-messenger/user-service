import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGroupDto {
	@ApiPropertyOptional({ description: 'Group name', maxLength: 100 })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	name?: string;

	@ApiPropertyOptional({ description: 'Group description' })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiPropertyOptional({ description: 'Group photo URL', maxLength: 500 })
	@IsOptional()
	@IsUrl()
	@MaxLength(500)
	photoUrl?: string;
}
