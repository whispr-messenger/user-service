import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrivacyLevel } from '../entities/privacy-settings.entity';

export class UpdatePrivacySettingsDto {
  @ApiPropertyOptional({
    description: 'Profile picture privacy level',
    enum: PrivacyLevel,
    example: PrivacyLevel.EVERYONE,
  })
  @IsOptional()
  @IsEnum(PrivacyLevel)
  profilePicturePrivacy?: PrivacyLevel;

  @ApiPropertyOptional({
    description: 'First name privacy level',
    enum: PrivacyLevel,
    example: PrivacyLevel.EVERYONE,
  })
  @IsOptional()
  @IsEnum(PrivacyLevel)
  firstNamePrivacy?: PrivacyLevel;

  @ApiPropertyOptional({
    description: 'Last name privacy level',
    enum: PrivacyLevel,
    example: PrivacyLevel.CONTACTS,
  })
  @IsOptional()
  @IsEnum(PrivacyLevel)
  lastNamePrivacy?: PrivacyLevel;

  @ApiPropertyOptional({
    description: 'Biography privacy level',
    enum: PrivacyLevel,
    example: PrivacyLevel.EVERYONE,
  })
  @IsOptional()
  @IsEnum(PrivacyLevel)
  biographyPrivacy?: PrivacyLevel;

  @ApiPropertyOptional({
    description: 'Last seen privacy level',
    enum: PrivacyLevel,
    example: PrivacyLevel.CONTACTS,
  })
  @IsOptional()
  @IsEnum(PrivacyLevel)
  lastSeenPrivacy?: PrivacyLevel;

  @ApiPropertyOptional({
    description: 'Allow search by phone number',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  searchByPhone?: boolean;

  @ApiPropertyOptional({
    description: 'Allow search by username',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  searchByUsername?: boolean;

  @ApiPropertyOptional({
    description: 'Send read receipts',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  readReceipts?: boolean;
}
