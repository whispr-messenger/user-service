import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../common/dto/user-response.dto';

export class BatchProfilesResponseDto {
	@ApiProperty({
		type: [UserResponseDto],
		description: 'Profils trouves et autorises (privacy gates appliquees individuellement).',
	})
	profiles!: UserResponseDto[];

	@ApiProperty({
		type: [String],
		format: 'uuid',
		description:
			'Identifiants demandes mais non retournes (utilisateur inexistant, supprime, ou autre indisponibilite).',
		example: ['c0000000-0000-4000-c000-000000000003'],
	})
	missing!: string[];
}
