import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddContactDto {
	@ApiProperty({ description: 'UUID of the user to add as contact', format: 'uuid' })
	@Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
		message: 'contactId must be a valid UUID',
	})
	contactId: string;

	@ApiPropertyOptional({ description: 'Optional nickname for the contact', maxLength: 100 })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	nickname?: string;
}
