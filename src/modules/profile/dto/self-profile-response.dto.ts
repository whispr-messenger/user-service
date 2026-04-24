import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../common/entities/user.entity';
import { UserResponseDto } from '../../common/dto/user-response.dto';

export class SelfProfileResponseDto extends UserResponseDto {
	@ApiProperty({ description: 'User phone number in E.164 format' })
	phoneNumber: string;

	static fromEntity(user: User): SelfProfileResponseDto {
		const base = UserResponseDto.fromEntity(user);
		const dto = new SelfProfileResponseDto();
		Object.assign(dto, base);
		dto.phoneNumber = user.phoneNumber;
		return dto;
	}
}
