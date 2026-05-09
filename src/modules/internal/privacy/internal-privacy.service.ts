import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../common/repositories';
import { PrivacySettingsRepository } from '../../privacy/repositories/privacy-settings.repository';
import { PrivacyLevel } from '../../privacy/entities/privacy-settings.entity';
import { InternalPrivacyResponseDto } from './dto/internal-privacy-response.dto';

@Injectable()
export class InternalPrivacyService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly privacySettingsRepository: PrivacySettingsRepository
	) {}

	async getPrivacyForInternal(userId: string): Promise<InternalPrivacyResponseDto> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}

		const settings = await this.privacySettingsRepository.findByUserId(userId);

		// pas de row -> renvoyer les defaults sans persister (lecture seule pour M2M)
		if (!settings) {
			return {
				userId,
				readReceipts: true,
				lastSeenPrivacy: PrivacyLevel.CONTACTS,
				onlineStatus: PrivacyLevel.CONTACTS,
			};
		}

		return {
			userId: settings.userId,
			readReceipts: settings.readReceipts,
			lastSeenPrivacy: settings.lastSeenPrivacy,
			onlineStatus: settings.onlineStatus,
		};
	}
}
