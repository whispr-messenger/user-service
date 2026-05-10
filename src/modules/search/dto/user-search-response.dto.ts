import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../common/entities/user.entity';

export class UserSearchResponseDto {
	@ApiProperty({
		type: () => User,
		nullable: true,
		description: 'Matched user, or null when no user matches the query',
	})
	user!: User | null;
}
