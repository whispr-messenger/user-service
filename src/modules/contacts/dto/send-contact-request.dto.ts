import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendContactRequestDto {
	@ApiProperty({ description: 'UUID of the user to send the request to', format: 'uuid' })
	@IsUUID()
	contactId: string;
}
