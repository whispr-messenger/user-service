import { IsArray, IsString, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BatchPhoneSearchDto {
	@ApiProperty({
		description: 'Array of E.164 phone numbers to search',
		type: [String],
		maxItems: 1000,
	})
	@IsArray()
	@IsString({ each: true })
	@ArrayMaxSize(1000)
	phoneNumbers: string[];
}
