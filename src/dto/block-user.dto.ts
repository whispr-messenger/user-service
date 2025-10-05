import { IsString, IsOptional, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlockUserDto {
  @ApiProperty({
    description: 'User ID to block',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  blockedUserId: string;

  @ApiPropertyOptional({
    description: 'Reason for blocking the user',
    example: 'Inappropriate behavior',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;
}
