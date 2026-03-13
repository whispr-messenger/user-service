import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePhoneDto {
	@ApiProperty({ description: 'New phone number', maxLength: 20 })
	@IsString()
	@IsNotEmpty()
	@MaxLength(20)
	phoneNumber: string;

	@ApiProperty({ description: 'Verification code from auth-service' })
	@IsString()
	@IsNotEmpty()
	verificationCode: string;
}
