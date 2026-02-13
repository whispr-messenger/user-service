import { IsString, IsOptional, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactRequestDto {
	@ApiProperty({
		description: 'User ID of the receiver',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	@IsUUID()
	receiverId: string;

	@ApiPropertyOptional({
		description: 'Optional message for the request',
		example: 'Hello, I would like to add you to my contacts.',
		maxLength: 500,
	})
	@IsOptional()
	@IsString()
	@Length(0, 500)
	message?: string;
}
