import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class UserResponseDto {
	@ApiProperty()
	id: string;

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
