import { ApiProperty } from '@nestjs/swagger';

export class CheckContactResponseDto {
	@ApiProperty({
		description: 'True when the (ownerId, contactId) pair exists in users.contacts',
	})
	isContact: boolean;

	@ApiProperty({
		description: 'True when either user has blocked the other',
	})
	isBlocked: boolean;
}
