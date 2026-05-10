import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckContactQueryDto {
	@ApiProperty({ description: 'UUID of the contact list owner', format: 'uuid' })
	@IsString()
	@IsNotEmpty({ message: 'ownerId is required' })
	@IsUUID(undefined, { message: 'ownerId must be a valid UUID' })
	ownerId: string;

	@ApiProperty({ description: 'UUID of the user to check against the owner', format: 'uuid' })
	@IsString()
	@IsNotEmpty({ message: 'contactId is required' })
	@IsUUID(undefined, { message: 'contactId must be a valid UUID' })
	contactId: string;
}
