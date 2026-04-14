import { IsOptional, IsEnum, IsUUID, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SanctionType } from './create-sanction.dto';

export class QuerySanctionsDto {
	@ApiPropertyOptional({ enum: SanctionType, description: 'Filter by sanction type' })
	@IsOptional()
	@IsEnum(SanctionType)
	type?: SanctionType;

	@ApiPropertyOptional({ description: 'Filter by user ID' })
	@IsOptional()
	@IsUUID()
	userId?: string;

	@ApiPropertyOptional({ description: 'Filter by active status (true/false)' })
	@IsOptional()
	@IsString()
	active?: string;

	@ApiPropertyOptional({ description: 'Start date for range filter (ISO 8601)' })
	@IsOptional()
	@IsDateString()
	dateFrom?: string;

	@ApiPropertyOptional({ description: 'End date for range filter (ISO 8601)' })
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
