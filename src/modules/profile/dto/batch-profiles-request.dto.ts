import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

const MAX_BATCH_SIZE = 100;

export class BatchProfilesRequestDto {
	@ApiProperty({
		type: [String],
		format: 'uuid',
		description: `Liste d'identifiants utilisateurs a recuperer en une seule requete (max ${MAX_BATCH_SIZE}).`,
		minItems: 1,
		maxItems: MAX_BATCH_SIZE,
		example: ['a0000000-0000-4000-a000-000000000001', 'b0000000-0000-4000-b000-000000000002'],
	})
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(MAX_BATCH_SIZE)
	@IsUUID('all', { each: true })
	ids!: string[];
}
