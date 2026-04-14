import { IsOptional, IsEnum, IsUUID, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AppealStatus {
	PENDING = 'pending',
	UNDER_REVIEW = 'under_review',
	ACCEPTED = 'accepted',
	REJECTED = 'rejected',
}

export class QueryAppealsDto {
	@ApiPropertyOptional({ enum: AppealStatus, description: 'Filter by appeal status' })
	@IsOptional()
	@IsEnum(AppealStatus)
	status?: AppealStatus;

	@ApiPropertyOptional({ description: 'Filter by user ID' })
	@IsOptional()
	@IsUUID()
	userId?: string;

	@ApiPropertyOptional({ description: 'Filter by sanction ID' })
	@IsOptional()
	@IsUUID()
	sanctionId?: string;

	@ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
	@IsOptional()
	@IsDateString()
	dateFrom?: string;

	@ApiPropertyOptional({ description: 'End date (ISO 8601)' })
	@IsOptional()
	@IsDateString()
	dateTo?: string;

	@ApiPropertyOptional({ description: 'Limit', default: 50 })
	@IsOptional()
	@IsString()
	limit?: string;

	@ApiPropertyOptional({ description: 'Offset', default: 0 })
	@IsOptional()
	@IsString()
	offset?: string;
}
