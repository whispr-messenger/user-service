import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppealResponseDto {
	@ApiProperty({ description: 'Appeal ID', format: 'uuid' })
	id: string;

	@ApiProperty({ description: 'User who filed the appeal', format: 'uuid' })
	userId: string;

	@ApiProperty({ description: 'Associated sanction ID', format: 'uuid' })
	sanctionId: string;

	@ApiProperty({ description: 'Reason for the appeal' })
	reason: string;

	@ApiProperty({ description: 'Supporting evidence', example: {} })
	evidence: Record<string, any>;

	@ApiProperty({ description: 'Appeal status', enum: ['pending', 'under_review', 'accepted', 'rejected'] })
	status: string;

	@ApiPropertyOptional({ description: 'Reviewer admin/moderator ID', format: 'uuid', nullable: true })
	reviewerId: string | null;

	@ApiPropertyOptional({ description: 'Notes from the reviewer', nullable: true })
	reviewerNotes: string | null;

	@ApiProperty({ description: 'Creation timestamp', type: 'string', format: 'date-time' })
	createdAt: Date;

	@ApiProperty({ description: 'Last update timestamp', type: 'string', format: 'date-time' })
	updatedAt: Date;

	@ApiPropertyOptional({
		description: 'Resolution timestamp',
		type: 'string',
		format: 'date-time',
		nullable: true,
	})
	resolvedAt: Date | null;
}

export class AppealStatsResponseDto {
	@ApiProperty({ description: 'Appeal status' })
	status: string;

	@ApiProperty({ description: 'Count of appeals with this status' })
	count: number;
}

export class AppealTimelineEventDto {
	@ApiProperty({ description: 'Event type' })
	event: string;

	@ApiProperty({ description: 'Event timestamp', type: 'string', format: 'date-time' })
	timestamp: Date;

	@ApiPropertyOptional({ description: 'Event details' })
	details?: string;
}

export class AppealTimelineResponseDto {
	@ApiProperty({ description: 'The appeal', type: AppealResponseDto })
	appeal: AppealResponseDto;

	@ApiProperty({ description: 'Timeline events', type: [AppealTimelineEventDto] })
	events: AppealTimelineEventDto[];
}
