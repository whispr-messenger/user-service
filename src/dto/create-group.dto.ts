import { IsString, IsOptional, Length, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({
    description: 'Group name',
    example: 'My Awesome Group',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({
    description: 'Group description',
    example: 'A group for discussing awesome topics',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Group picture URL',
    example: 'https://example.com/group-picture.jpg',
  })
  @IsOptional()
  @IsUrl()
  pictureUrl?: string;
}
