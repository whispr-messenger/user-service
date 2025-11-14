import { IsString, IsOptional, Length, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGroupDto {
  @ApiPropertyOptional({
    description: 'Group name',
    example: 'Updated Group Name',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Group description',
    example: 'Updated group description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Group picture URL',
    example: 'https://avatars.githubusercontent.com/u/92697916?v=4',
  })
  @IsOptional()
  @IsUrl()
  pictureUrl?: string;
}
