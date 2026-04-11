import { IsString, MaxLength, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateContactDto {
	@ApiPropertyOptional({
		description: 'Nickname for the contact. Pass null to clear it, omit to leave unchanged.',
		maxLength: 100,
		nullable: true,
	})
	@ValidateIf((_, value) => value !== null && value !== undefined)
	@IsString()
	@MaxLength(100)
	nickname?: string | null;
}
