import { IsUrl, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadPhotoDto {
	@ApiProperty({ description: 'URL of the uploaded profile picture', maxLength: 500 })
	@IsUrl()
	@MaxLength(500)
	profilePictureUrl: string;
}
