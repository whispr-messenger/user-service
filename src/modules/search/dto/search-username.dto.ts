import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchUsernameDto {
	@ApiProperty({ description: 'Username to search for' })
	@IsString()
	@IsNotEmpty()
	query: string;
}
