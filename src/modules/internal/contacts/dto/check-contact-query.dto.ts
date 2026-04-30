import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CheckContactQueryDto {
	@ApiProperty({ description: 'UUID of the contact list owner', format: 'uuid' })
	@IsString()
	@IsNotEmpty({ message: 'ownerId is required' })
	@Matches(UUID_REGEX, { message: 'ownerId must be a valid UUID' })
	ownerId: string;

	@ApiProperty({ description: 'UUID of the user to check against the owner', format: 'uuid' })
	@IsString()
	@IsNotEmpty({ message: 'contactId is required' })
	@Matches(UUID_REGEX, { message: 'contactId must be a valid UUID' })
	contactId: string;
}
