import {
  IsString,
  IsOptional,
  IsPhoneNumber,
  Length,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+33612345678',
  })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({
    description: 'Username (unique)',
    example: 'john_doe',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @Length(3, 50)
  username: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User biography',
    example: 'Software developer passionate about technology',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  biography?: string;

  @ApiPropertyOptional({
    description: 'Profile picture URL',
    example: 'https://example.com/profile.jpg',
  })
  @IsOptional()
  @IsUrl()
  profilePictureUrl?: string;
}
