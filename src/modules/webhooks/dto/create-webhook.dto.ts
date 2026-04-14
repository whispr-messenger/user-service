import { IsUrl, IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
	@ApiProperty({ description: 'Webhook endpoint URL' })
	@IsUrl()
	url: string;

	@ApiProperty({
		description: 'Event types to subscribe to',
		example: ['sanction.created', 'appeal.resolved', 'report.received'],
	})
	@IsArray()
	@IsString({ each: true })
	events: string[];

	@ApiPropertyOptional({ description: 'HMAC secret for signature verification' })
	@IsOptional()
	@IsString()
	secret?: string;
}
