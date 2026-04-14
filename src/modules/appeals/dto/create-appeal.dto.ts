import { IsUUID, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppealDto {
	@ApiProperty({ description: 'Sanction to appeal' })
	@IsUUID()
	sanctionId: string;

	@ApiProperty({ description: 'Reason for the appeal' })
	@IsString()
	reason: string;

	@ApiPropertyOptional({ description: 'Supporting evidence' })
	@IsOptional()
	@IsObject()
	evidence?: Record<string, any>;
}
