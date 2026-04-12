import { IsArray, IsString, ArrayMaxSize, ArrayMinSize, IsDefined } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BatchPhoneSearchDto {
	@ApiProperty({
		description: 'Array of E.164 phone numbers to search',
		type: [String],
		minItems: 1,
		maxItems: 1000,
	})
	@IsDefined()
	@IsArray()
	@IsString({ each: true })
	@ArrayMinSize(1)
	@ArrayMaxSize(1000)
	phoneNumbers: string[];
}
