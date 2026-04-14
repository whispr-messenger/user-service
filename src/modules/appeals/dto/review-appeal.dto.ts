import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReviewStatus {
	ACCEPTED = 'accepted',
	REJECTED = 'rejected',
}

export class ReviewAppealDto {
	@ApiProperty({ enum: ReviewStatus, description: 'Accept or reject the appeal' })
	@IsEnum(ReviewStatus)
	status: ReviewStatus;

	@ApiPropertyOptional({ description: 'Reviewer notes' })
	@IsOptional()
	@IsString()
	reviewerNotes?: string;
}
