import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User, UserVisualPreferences } from '../entities/user.entity';
import { maskPhone } from '../../../utils/mask-phone.util';

export class UserResponseDto {
	@ApiProperty()
	id: string;

	@ApiPropertyOptional({
		nullable: true,
		description: 'Numero de telephone masque pour fallback display (ex: +33***1234)',
	})
	phoneNumberMasked: string | null;

	@ApiPropertyOptional({ nullable: true })
	username: string | null;

	@ApiPropertyOptional({ nullable: true })
	firstName: string | null;

	@ApiPropertyOptional({ nullable: true })
	lastName: string | null;

	@ApiPropertyOptional({ nullable: true })
	biography: string | null;

	@ApiPropertyOptional({ nullable: true })
	profilePictureUrl: string | null;

	@ApiPropertyOptional({ nullable: true })
	visualPreferences: UserVisualPreferences | null;

	@ApiPropertyOptional({ nullable: true })
	backgroundMediaId: string | null;

	@ApiPropertyOptional({ nullable: true })
	backgroundMediaUrl: string | null;

	@ApiPropertyOptional({ nullable: true })
	lastSeen: Date | null;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	static fromEntity(user: User): UserResponseDto {
		const dto = new UserResponseDto();
		dto.id = user.id;
		dto.phoneNumberMasked = maskPhone(user.phoneNumber);
		dto.username = user.username;
		dto.firstName = user.firstName;
		dto.lastName = user.lastName;
		dto.biography = user.biography ?? null;
		dto.profilePictureUrl = user.profilePictureUrl ?? null;
		dto.visualPreferences = user.visualPreferences ?? null;
		dto.backgroundMediaId = user.visualPreferences?.backgroundMediaId ?? null;
		dto.backgroundMediaUrl = user.visualPreferences?.backgroundMediaUrl ?? null;
		dto.lastSeen = user.lastSeen ?? null;
		dto.createdAt = user.createdAt;
		dto.updatedAt = user.updatedAt;
		return dto;
	}
}
