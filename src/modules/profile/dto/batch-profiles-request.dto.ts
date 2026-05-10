import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, Matches } from 'class-validator';

const MAX_BATCH_SIZE = 100;

// Accepte tout UUID en 8-4-4-4-12 hex, quel que soit le nibble de version.
// @IsUUID('all') impose les versions RFC 1-5 et rejette les IDs seed du
// messaging-service (ex: a0000002-0000-0000-0000-000000000002) dont le
// nibble vaut 0. Ces IDs sont valides en production et doivent passer.
const UUID_LOOSE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
	@Matches(UUID_LOOSE_RE, { each: true, message: 'each value in ids must be a UUID' })
	ids!: string[];
}
