import { IsEnum, IsUUID, IsString, IsOptional, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SanctionType {
	WARNING = 'warning',
	TEMP_BAN = 'temp_ban',
	PERM_BAN = 'perm_ban',
}

export class CreateSanctionDto {
	@ApiProperty({ description: 'User to sanction' })
	@IsUUID()
	userId: string;

	@ApiProperty({ enum: SanctionType })
	@IsEnum(SanctionType)
	type: SanctionType;

	@ApiProperty({ description: 'Reason for sanction' })
	@IsString()
	reason: string;

	@ApiPropertyOptional({ description: 'Reference to report IDs, conversation IDs' })
	@IsOptional()
	@IsObject()
	evidenceRef?: Record<string, any>;

	@ApiPropertyOptional({ description: 'Expiration date (ISO 8601)' })
	@IsOptional()
	@IsDateString()
	expiresAt?: string;
}
