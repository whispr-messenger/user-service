import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupRole } from '../entities/group-member.entity';

export class AddGroupMemberDto {
  @ApiProperty({
    description: 'User ID to add to the group',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: 'Role of the member in the group',
    enum: GroupRole,
    example: GroupRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(GroupRole)
  role?: GroupRole;
}
