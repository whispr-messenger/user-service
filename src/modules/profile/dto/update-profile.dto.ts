import {
	IsIn,
	IsISO8601,
	IsObject,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	ValidateIf,
	ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const ALLOWED_THEMES = ['light', 'dark', 'auto'] as const;
const ALLOWED_LANGUAGES = ['fr', 'en'] as const;
const ALLOWED_FONT_SIZES = ['small', 'medium', 'large'] as const;
const ALLOWED_BACKGROUND_PRESETS = ['whispr', 'midnight', 'sunset', 'aurora', 'custom'] as const;

export class VisualPreferencesDto {
	@ApiPropertyOptional({ enum: ALLOWED_THEMES })
	@IsOptional()
	@IsIn(ALLOWED_THEMES)
	theme?: (typeof ALLOWED_THEMES)[number];

	@ApiPropertyOptional({ enum: ALLOWED_LANGUAGES })
	@IsOptional()
	@IsIn(ALLOWED_LANGUAGES)
	language?: (typeof ALLOWED_LANGUAGES)[number];

	@ApiPropertyOptional({ enum: ALLOWED_FONT_SIZES })
	@IsOptional()
	@IsIn(ALLOWED_FONT_SIZES)
	fontSize?: (typeof ALLOWED_FONT_SIZES)[number];

	@ApiPropertyOptional({ enum: ALLOWED_BACKGROUND_PRESETS })
	@IsOptional()
	@IsIn(ALLOWED_BACKGROUND_PRESETS)
	backgroundPreset?: (typeof ALLOWED_BACKGROUND_PRESETS)[number];

	@ApiPropertyOptional({ nullable: true, format: 'uuid' })
	@ValidateIf((_, value) => value !== null && value !== undefined)
	@IsUUID()
	backgroundMediaId?: string | null;

	@ApiPropertyOptional({ nullable: true, maxLength: 500 })
	@ValidateIf((_, value) => value !== null && value !== undefined)
	@IsString()
	@MaxLength(500)
	backgroundMediaUrl?: string | null;

	@ApiPropertyOptional({ nullable: true, description: 'ISO timestamp for conflict resolution between devices' })
	@ValidateIf((_, value) => value !== null && value !== undefined)
	@IsISO8601()
	updatedAt?: string | null;
}

export class UpdateProfileDto {
	@ApiPropertyOptional({ description: 'Username', maxLength: 50 })
	@IsOptional()
	@IsString()
	@MaxLength(50)
	username?: string;

	@ApiPropertyOptional({ description: 'First name', maxLength: 100 })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	firstName?: string;

	@ApiPropertyOptional({ description: 'Last name', maxLength: 100 })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	lastName?: string;

	@ApiPropertyOptional({ description: 'User biography' })
	@IsOptional()
	@IsString()
	biography?: string;

	@ApiPropertyOptional({
		description:
			'UUID returned by POST /media/v1/upload (context=avatar). ' +
			'When provided, the service resolves it to a URL via media-service ' +
			'and updates profilePictureUrl accordingly.',
	})
	@IsOptional()
	@IsUUID()
	avatarMediaId?: string;

	@ApiPropertyOptional({
		description: 'Legacy custom background media UUID. Mapped into visualPreferences for backward compatibility.',
		nullable: true,
		format: 'uuid',
	})
	@ValidateIf((_, value) => value !== null && value !== undefined)
	@IsUUID()
	backgroundMediaId?: string | null;

	@ApiPropertyOptional({
		description: 'Legacy custom background media URL. Mapped into visualPreferences for backward compatibility.',
		nullable: true,
		maxLength: 500,
	})
	@ValidateIf((_, value) => value !== null && value !== undefined)
	@IsString()
	@MaxLength(500)
	backgroundMediaUrl?: string | null;

	@ApiPropertyOptional({
		description: 'Visual preferences snapshot synchronized across devices.',
		type: VisualPreferencesDto,
	})
	@IsOptional()
	@IsObject()
	@ValidateNested()
	@Type(() => VisualPreferencesDto)
	visualPreferences?: VisualPreferencesDto;
}
