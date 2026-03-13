import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupRole } from '../entities/group-member.entity';

export class AddGroupMemberDto {
	@ApiProperty({ description: 'UUID of the user to add', format: 'uuid' })
	@IsUUID()
	userId: string;

	@ApiPropertyOptional({ description: 'Role in the group', enum: GroupRole, default: GroupRole.MEMBER })
	@IsOptional()
	@IsEnum(GroupRole)
	role?: GroupRole;
}
