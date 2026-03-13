import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateContactDto {
	@ApiPropertyOptional({ description: 'Updated nickname for the contact', maxLength: 100 })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	nickname?: string;
}
