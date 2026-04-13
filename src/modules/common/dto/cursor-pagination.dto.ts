import { IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CursorPaginationDto {
	@ApiPropertyOptional({ description: 'Cursor (UUID of the last item from the previous page)' })
	@IsOptional()
	@IsUUID()
	cursor?: string;

	@ApiPropertyOptional({ description: 'Number of items per page (default 50, max 100)', default: 50 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;
}

export interface CursorPaginatedResult<T> {
	data: T[];
	nextCursor: string | null;
	hasMore: boolean;
}
