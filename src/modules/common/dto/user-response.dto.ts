import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class UserResponseDto {
	@ApiProperty()
	id: string;

	@ApiPropertyOptional()
	username: string | null;

	@ApiPropertyOptional()
	firstName: string | null;

	@ApiPropertyOptional()
	lastName: string | null;

	@ApiPropertyOptional()
	biography: string | null;

	@ApiPropertyOptional()
	profilePictureUrl: string | null;

	@ApiPropertyOptional()
	lastSeen: Date | null;

	@ApiProperty()
	createdAt: Date;

	@ApiProperty()
	updatedAt: Date;

	static fromEntity(user: User): UserResponseDto {
		const dto = new UserResponseDto();
		dto.id = user.id;
		dto.username = user.username;
		dto.firstName = user.firstName;
		dto.lastName = user.lastName;
		dto.biography = user.biography ?? null;
		dto.profilePictureUrl = user.profilePictureUrl ?? null;
		dto.lastSeen = user.lastSeen ?? null;
		dto.createdAt = user.createdAt;
		dto.updatedAt = user.updatedAt;
		return dto;
	}
}
