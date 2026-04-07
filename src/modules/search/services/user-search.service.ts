import { Injectable, NotFoundException } from '@nestjs/common';
import { SearchIndexService, SearchIndexEntry } from '../../cache/search-index.service';
import { PrivacyService } from '../../privacy/services/privacy.service';
import { UserRepository } from '../../common/repositories';
import { User } from '../../common/entities/user.entity';

export interface UserSearchResult {
	userId: string;
	username: string | null;
	firstName: string | null;
	lastName: string | null;
}

@Injectable()
export class UserSearchService {
	constructor(
		private readonly searchIndexService: SearchIndexService,
		private readonly privacyService: PrivacyService,
		private readonly userRepository: UserRepository
	) {}

	async searchByPhone(phoneNumber: string): Promise<User | null> {
		const userIdFromIndex = await this.searchIndexService.searchByPhoneNumber(phoneNumber);
		const userId = userIdFromIndex ?? (await this.userRepository.findByPhoneNumber(phoneNumber))?.id;
		if (!userId) return null;

		const privacy = await this.privacyService.getSettings(userId);
		if (!privacy.searchByPhone) {
			return null;
		}

		const user = await this.userRepository.findById(userId);
		if (user && !userIdFromIndex) {
			await this.searchIndexService.indexUser(user);
		}
		return user;
	}

	async searchByUsername(username: string): Promise<User | null> {
		const userIdFromIndex = await this.searchIndexService.searchByUsername(username);
		const userId = userIdFromIndex ?? (await this.userRepository.findByUsernameInsensitive(username))?.id;
		if (!userId) return null;

		const privacy = await this.privacyService.getSettings(userId);
		if (!privacy.searchByUsername) {
			return null;
		}

		const user = await this.userRepository.findById(userId);
		if (user && !userIdFromIndex) {
			await this.searchIndexService.indexUser(user);
		}
		return user;
	}

	async searchByDisplayName(query: string, limit: number = 20): Promise<UserSearchResult[]> {
		const userIds = await this.searchIndexService.searchByName(query, limit);
		const results: UserSearchResult[] = [];

		for (const userId of userIds) {
			const entry: SearchIndexEntry | null = await this.searchIndexService.getCachedUser(userId);
			if (entry) {
				results.push({
					userId: entry.userId,
					username: entry.username,
					firstName: entry.firstName,
					lastName: entry.lastName,
				});
			}
		}

		return results;
	}

	async indexUser(userId: string): Promise<void> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		await this.searchIndexService.indexUser(user);
	}
}
