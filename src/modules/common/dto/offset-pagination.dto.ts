import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// pagination obligatoire pour eviter le full table scan (WHISPR-1382)
export class OffsetPaginationDto {
	@ApiPropertyOptional({ description: 'Nombre max d items (default 50, max 200)', default: 50 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(200)
	limit?: number;

	@ApiPropertyOptional({ description: 'Nombre d items a sauter (default 0)', default: 0 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	offset?: number;
}
