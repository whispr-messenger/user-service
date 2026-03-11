import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { User } from '../../common/entities/user.entity';
import { UserRepository } from '../../common/repositories';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class ProfileService {
	constructor(private readonly userRepository: UserRepository) {}

	private async findOne(id: string): Promise<User> {
		const user = await this.userRepository.findById(id);

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return user;
	}

	public async getProfile(id: string): Promise<User> {
		return this.findOne(id);
	}

	public async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
		const user = await this.findOne(id);

		if (dto.username && dto.username !== user.username) {
			const existing = await this.userRepository.findByUsernameInsensitive(dto.username, true);
			if (existing) {
				throw new ConflictException('Username already taken');
			}
		}

		Object.assign(user, dto);

		return this.userRepository.save(user);
	}
}
