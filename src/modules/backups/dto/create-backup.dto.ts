import { IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBackupDto {
	@ApiProperty({
		description: 'Backup payload produced by the client export flow',
		type: 'object',
		additionalProperties: true,
	})
	@IsObject()
	@IsNotEmpty()
	data: Record<string, unknown>;
}
