import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GroupRole } from '../entities/group-member.entity';

export class UpdateMemberRoleDto {
	@ApiProperty({ description: 'New role for the member', enum: GroupRole })
	@IsEnum(GroupRole)
	role: GroupRole;
}
