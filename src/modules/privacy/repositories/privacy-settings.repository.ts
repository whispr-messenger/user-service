import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivacySettings, PrivacyLevel, MediaAutoDownload } from '../entities/privacy-settings.entity';

@Injectable()
export class PrivacySettingsRepository {
	constructor(
		@InjectRepository(PrivacySettings)
		private readonly repo: Repository<PrivacySettings>
	) {}

	async findByUserId(userId: string): Promise<PrivacySettings | null> {
		return this.repo.findOne({ where: { userId } });
	}

	async createDefault(userId: string): Promise<PrivacySettings> {
		const settings = this.repo.create({
			userId,
			profilePicturePrivacy: PrivacyLevel.EVERYONE,
			firstNamePrivacy: PrivacyLevel.EVERYONE,
			lastNamePrivacy: PrivacyLevel.CONTACTS,
			biographyPrivacy: PrivacyLevel.EVERYONE,
			lastSeenPrivacy: PrivacyLevel.CONTACTS,
			searchByPhone: true,
			searchByUsername: true,
			readReceipts: true,
			onlineStatus: PrivacyLevel.CONTACTS,
			groupAddPermission: PrivacyLevel.CONTACTS,
			mediaAutoDownload: MediaAutoDownload.WIFI_ONLY,
		});
		return this.repo.save(settings);
	}

	async save(settings: PrivacySettings): Promise<PrivacySettings> {
		return this.repo.save(settings);
	}
}
