import { IsString, IsOptional, IsBoolean, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateContactDto {
  @ApiPropertyOptional({
    description: 'Nickname for the contact',
    example: 'Best Friend Updated',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  nickname?: string;

  @ApiPropertyOptional({
    description: 'Mark contact as favorite',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
