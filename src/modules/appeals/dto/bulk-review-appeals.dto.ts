import { IsArray, IsEnum, IsOptional, IsString, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewStatus } from './review-appeal.dto';

// WHISPR-1063: cap batch size so a bad request can't lock the DB or
// exhaust the request timeout. 100 mirrors what the queue endpoint returns
// by default.
export const BULK_REVIEW_MAX_SIZE = 100;

export class BulkReviewAppealsDto {
	@ApiProperty({
		type: [String],
		format: 'uuid',
		description: 'UUIDs of the appeals to review',
	})
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(BULK_REVIEW_MAX_SIZE)
	@IsUUID(undefined, { each: true })
	appealIds: string[];

	@ApiProperty({ enum: ReviewStatus, description: 'Apply the same decision to every appeal' })
	@IsEnum(ReviewStatus)
	status: ReviewStatus;

	@ApiPropertyOptional({ description: 'Shared reviewer notes' })
	@IsOptional()
	@IsString()
	reviewerNotes?: string;
}

export class BulkReviewAppealsResponseDto {
	@ApiProperty({ type: [String], description: 'IDs reviewed successfully' })
	succeeded: string[];

	@ApiProperty({
		description: 'IDs that failed along with an error message',
		example: [{ appealId: '…', error: 'Appeal already resolved' }],
	})
	failed: Array<{ appealId: string; error: string }>;
}
