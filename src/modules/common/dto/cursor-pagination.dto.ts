import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CursorPaginationDto {
	@ApiPropertyOptional({
		description:
			'Opaque pagination cursor — pass back the `nextCursor` value returned by the previous page. Encoded as base64url of (createdAt, id).',
	})
	@IsOptional()
	@IsString()
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
