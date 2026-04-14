import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRoleEnum {
	USER = 'user',
	MODERATOR = 'moderator',
	ADMIN = 'admin',
}

export class SetRoleDto {
	@ApiProperty({ enum: UserRoleEnum, description: 'Role to assign' })
	@IsEnum(UserRoleEnum)
	role: UserRoleEnum;
}
