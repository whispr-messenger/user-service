import { IsString, IsOptional, IsUUID, MaxLength, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

	@ApiPropertyOptional({ description: 'Profile picture URL', maxLength: 500 })
	@IsOptional()
	@IsUrl()
	@MaxLength(500)
	profilePictureUrl?: string;

	@ApiPropertyOptional({
		description:
			'UUID returned by POST /media/upload (context=avatar). ' +
			'When provided, the service resolves it to a URL via media-service ' +
			'and updates profilePictureUrl accordingly.',
	})
	@IsOptional()
	@IsUUID()
	avatarMediaId?: string;
}
