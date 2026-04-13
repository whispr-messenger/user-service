import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PhoneSearchQueryDto {
	@ApiProperty({ description: 'E.164 phone number', example: '+33612345678' })
	@IsString()
	@IsNotEmpty()
	phoneNumber: string;
}
