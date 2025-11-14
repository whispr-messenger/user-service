import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: "Thème ('dark' | 'light')", example: 'dark' })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiPropertyOptional({ description: "Type de fond ('black' | 'color' | 'gradient')", example: 'black' })
  @IsOptional()
  @IsString()
  backgroundType?: string;

  @ApiPropertyOptional({ description: 'Couleur hex (#RRGGBB)', example: '#101820' })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{6})$/)
  backgroundColor?: string;

  @ApiPropertyOptional({ description: "URL d'avatar", example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsString()
  avatarUri?: string;

  @ApiPropertyOptional({ description: "ID média pour le fond d’écran", example: '8f1b6f7a-1234-4da2-bc77-9b6d2c0e9abc' })
  @IsOptional()
  @IsString()
  backgroundImageId?: string;
}