import { IsString, IsOptional, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddContactDto {
  @ApiProperty({
    description: 'Contact user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  contactId: string;

  @ApiPropertyOptional({
    description: 'Nickname for the contact',
    example: 'Best Friend',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  nickname?: string;
}
