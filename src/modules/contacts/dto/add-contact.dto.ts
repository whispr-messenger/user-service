import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddContactDto {
	@ApiProperty({ description: 'UUID of the user to add as contact', format: 'uuid' })
	@IsUUID()
	contactId: string;

	@ApiPropertyOptional({ description: 'Optional nickname for the contact', maxLength: 100 })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	nickname?: string;
}
