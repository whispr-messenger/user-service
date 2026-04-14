import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SanctionResponseDto {
	@ApiProperty({ description: 'Sanction ID', format: 'uuid' })
	id: string;

	@ApiProperty({ description: 'Sanctioned user ID', format: 'uuid' })
	userId: string;

	@ApiProperty({ description: 'Sanction type', enum: ['warning', 'temp_ban', 'perm_ban'] })
	type: string;

	@ApiProperty({ description: 'Reason for the sanction' })
	reason: string;

	@ApiProperty({ description: 'Reference to supporting evidence', example: {} })
	evidenceRef: Record<string, any>;

	@ApiProperty({ description: 'ID of the admin/moderator who issued the sanction', format: 'uuid' })
	issuedBy: string;

	@ApiPropertyOptional({
		description: 'Expiration date (null if permanent)',
		type: 'string',
		format: 'date-time',
		nullable: true,
	})
	expiresAt: Date | null;

	@ApiProperty({ description: 'Whether the sanction is currently active' })
	active: boolean;

	@ApiProperty({ description: 'Creation timestamp', type: 'string', format: 'date-time' })
	createdAt: Date;

	@ApiProperty({ description: 'Last update timestamp', type: 'string', format: 'date-time' })
	updatedAt: Date;
}

export class SanctionStatsResponseDto {
	@ApiProperty({ description: 'Sanction type' })
	type: string;

	@ApiProperty({ description: 'Count of sanctions of this type' })
	count: number;
}
