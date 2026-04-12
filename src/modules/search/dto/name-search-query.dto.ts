import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NameSearchQueryDto {
	@ApiProperty({ description: 'Name search query' })
	@IsString()
	@IsNotEmpty()
	query: string;

	@ApiPropertyOptional({ description: 'Max results (default 20, max 100)' })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;
}
