import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../common/repositories';
import { PrivacySettingsRepository } from '../repositories/privacy-settings.repository';
import { PrivacySettings } from '../entities/privacy-settings.entity';
import { UpdatePrivacySettingsDto } from '../dto/update-privacy-settings.dto';

@Injectable()
export class PrivacyService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly privacySettingsRepository: PrivacySettingsRepository
	) {}

	private async ensureUserExists(userId: string): Promise<void> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
	}

	async getSettings(userId: string): Promise<PrivacySettings> {
		await this.ensureUserExists(userId);

		const settings = await this.privacySettingsRepository.findByUserId(userId);
		if (!settings) {
			return this.privacySettingsRepository.createDefault(userId);
		}
		return settings;
	}

	async updateSettings(userId: string, dto: UpdatePrivacySettingsDto): Promise<PrivacySettings> {
		const settings = await this.getSettings(userId);
		Object.assign(settings, dto);
		return this.privacySettingsRepository.save(settings);
	}
}
