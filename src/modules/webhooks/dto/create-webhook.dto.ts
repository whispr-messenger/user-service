import { IsUrl, IsArray, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
	@ApiProperty({ description: 'Webhook endpoint URL' })
	// SSRF + DoS via huge string : exiger TLD + protocole http/https et plafonner la longueur (WHISPR-1382)
	@IsUrl({ require_tld: true, require_protocol: true })
	@MaxLength(2048)
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
