import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchPhoneDto {
	@ApiProperty({ description: 'Hashed phone number to search for' })
	@IsString()
	@IsNotEmpty()
	hash: string;
}
