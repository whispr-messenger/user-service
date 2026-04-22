import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// WHISPR-1063: same cap as bulk appeals review for consistency.
export const BULK_LIFT_MAX_SIZE = 100;

export class BulkLiftSanctionsDto {
	@ApiProperty({
		type: [String],
		format: 'uuid',
		description: 'UUIDs of the sanctions to lift',
	})
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(BULK_LIFT_MAX_SIZE)
	@IsUUID(undefined, { each: true })
	sanctionIds: string[];
}

export class BulkLiftSanctionsResponseDto {
	@ApiProperty({ type: [String], description: 'IDs lifted successfully' })
	succeeded: string[];

	@ApiProperty({
		description: 'IDs that failed along with an error message',
		example: [{ sanctionId: '…', error: 'Sanction already lifted' }],
	})
	failed: Array<{ sanctionId: string; error: string }>;
}
