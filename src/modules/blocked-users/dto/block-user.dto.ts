import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockUserDto {
	@ApiProperty({ description: 'UUID of the user to block', format: 'uuid' })
	@IsUUID()
	blockedId: string;
}
