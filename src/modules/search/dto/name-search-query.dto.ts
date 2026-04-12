import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class NameSearchQueryDto {
	@ApiProperty({ description: 'Name search query' })
	@IsString()
	@IsNotEmpty()
	query: string;

	@ApiProperty({ description: 'Max results (default 20, max 100)', required: false })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;
}
