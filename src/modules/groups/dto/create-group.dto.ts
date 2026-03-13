import { IsString, IsOptional, IsUUID, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
	@ApiProperty({ description: 'Group name', maxLength: 100 })
	@IsString()
	@MaxLength(100)
	name: string;

	@ApiPropertyOptional({ description: 'Group description' })
	@IsOptional()
	@IsString()
	description?: string;

	@ApiPropertyOptional({ description: 'Group photo URL', maxLength: 500 })
	@IsOptional()
	@IsUrl()
	@MaxLength(500)
	photoUrl?: string;

	@ApiProperty({ description: 'UUID of the user creating the group', format: 'uuid' })
	@IsUUID()
	createdBy: string;
}
