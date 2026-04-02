import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrivacyLevel, MediaAutoDownload } from '../entities/privacy-settings.entity';

export class UpdatePrivacySettingsDto {
	@ApiPropertyOptional({ enum: PrivacyLevel, description: 'Who can see the profile picture' })
	@IsOptional()
	@IsEnum(PrivacyLevel)
	profilePicturePrivacy?: PrivacyLevel;

	@ApiPropertyOptional({ enum: PrivacyLevel, description: 'Who can see the first name' })
	@IsOptional()
	@IsEnum(PrivacyLevel)
	firstNamePrivacy?: PrivacyLevel;

	@ApiPropertyOptional({ enum: PrivacyLevel, description: 'Who can see the last name' })
	@IsOptional()
	@IsEnum(PrivacyLevel)
	lastNamePrivacy?: PrivacyLevel;

	@ApiPropertyOptional({ enum: PrivacyLevel, description: 'Who can see the biography' })
	@IsOptional()
	@IsEnum(PrivacyLevel)
	biographyPrivacy?: PrivacyLevel;

	@ApiPropertyOptional({ enum: PrivacyLevel, description: 'Who can see the last seen timestamp' })
	@IsOptional()
	@IsEnum(PrivacyLevel)
	lastSeenPrivacy?: PrivacyLevel;

	@ApiPropertyOptional({ description: 'Allow discovery by phone number' })
	@IsOptional()
	@IsBoolean()
	searchByPhone?: boolean;

	@ApiPropertyOptional({ description: 'Allow discovery by username' })
	@IsOptional()
	@IsBoolean()
	searchByUsername?: boolean;

	@ApiPropertyOptional({ description: 'Send read receipts' })
	@IsOptional()
	@IsBoolean()
	readReceipts?: boolean;

	@ApiPropertyOptional({ enum: PrivacyLevel, description: 'Who can see online status' })
	@IsOptional()
	@IsEnum(PrivacyLevel)
	onlineStatus?: PrivacyLevel;

	@ApiPropertyOptional({ enum: PrivacyLevel, description: 'Who can add user to groups' })
	@IsOptional()
	@IsEnum(PrivacyLevel)
	groupAddPermission?: PrivacyLevel;

	@ApiPropertyOptional({ enum: MediaAutoDownload, description: 'Media auto-download preference' })
	@IsOptional()
	@IsEnum(MediaAutoDownload)
	mediaAutoDownload?: MediaAutoDownload;
}
