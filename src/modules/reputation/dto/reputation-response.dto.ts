import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReputationResponseDto {
	@ApiProperty({ description: 'Reputation record ID', format: 'uuid' })
	id: string;

	@ApiProperty({ description: 'User ID', format: 'uuid' })
	userId: string;

	@ApiProperty({ description: 'Reputation score (0-100)', minimum: 0, maximum: 100 })
	score: number;

	@ApiProperty({ description: 'Total reports received by this user' })
	totalReportsReceived: number;

	@ApiProperty({ description: 'Total reports filed by this user' })
	totalReportsFiled: number;

	@ApiProperty({ description: 'Total sanctions received' })
	totalSanctions: number;

	@ApiProperty({ description: 'Total appeals filed' })
	totalAppeals: number;

	@ApiProperty({ description: 'Number of appeals that were accepted' })
	appealsAccepted: number;

	@ApiPropertyOptional({
		description: 'Timestamp of the last sanction',
		type: 'string',
		format: 'date-time',
		nullable: true,
	})
	lastSanctionAt: Date | null;

	@ApiProperty({ description: 'Creation timestamp', type: 'string', format: 'date-time' })
	createdAt: Date;

	@ApiProperty({ description: 'Last update timestamp', type: 'string', format: 'date-time' })
	updatedAt: Date;
}
