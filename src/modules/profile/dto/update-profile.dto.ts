import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
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

	@ApiPropertyOptional({ description: 'User biography', maxLength: 500 })
	@IsOptional()
	@IsString()
	@MaxLength(500)
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
}
