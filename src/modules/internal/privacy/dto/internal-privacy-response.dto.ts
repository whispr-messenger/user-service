import { ApiProperty } from '@nestjs/swagger';
import { PrivacyLevel } from '../../../privacy/entities/privacy-settings.entity';

export class InternalPrivacyResponseDto {
	@ApiProperty({ description: 'UUID of the user the privacy settings belong to', format: 'uuid' })
	userId: string;

	@ApiProperty({ description: 'Whether read receipts are enabled' })
	readReceipts: boolean;

	@ApiProperty({
		description: 'Audience that can see last seen timestamp',
		enum: PrivacyLevel,
	})
	lastSeenPrivacy: PrivacyLevel;

	@ApiProperty({
		description: 'Audience that can see online status',
		enum: PrivacyLevel,
	})
	onlineStatus: PrivacyLevel;
}
