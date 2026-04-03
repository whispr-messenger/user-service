import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
	private readonly logger = new Logger(UserSearchService.name);

	constructor(
		private readonly searchIndexService: SearchIndexService,
		private readonly privacyService: PrivacyService,
		private readonly userRepository: UserRepository
	) {}

	async searchByPhone(phoneNumber: string): Promise<User | null> {
		// Try Redis index first
		let userId = await this.searchIndexService.searchByPhoneNumber(phoneNumber);

		// Fallback to database if not in Redis
		if (!userId) {
			const user = await this.userRepository.findByPhoneNumber(phoneNumber);
			if (!user) {
				return null;
			}
			userId = user.id;
			// Re-index for next time
			this.reindexUser(user);
		}

		const privacy = await this.privacyService.getSettings(userId);
		if (!privacy.searchByPhone) {
			return null;
		}

		return this.userRepository.findById(userId);
	}

	async searchByUsername(username: string): Promise<User | null> {
		// Try Redis index first
		let userId = await this.searchIndexService.searchByUsername(username);

		// Fallback to database if not in Redis
		if (!userId) {
			const user = await this.userRepository.findByUsernameInsensitive(username);
			if (!user) {
				return null;
			}
			userId = user.id;
			// Re-index for next time
			this.reindexUser(user);
		}

		const privacy = await this.privacyService.getSettings(userId);
		if (!privacy.searchByUsername) {
			return null;
		}

		return this.userRepository.findById(userId);
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

		// Fallback to database if Redis returned no results
		if (results.length === 0) {
			const dbResults = await this.userRepository.searchByDisplayName(query, limit);
			for (const user of dbResults) {
				results.push({
					userId: user.id,
					username: user.username,
					firstName: user.firstName,
					lastName: user.lastName,
				});
				// Re-index for next time
				this.reindexUser(user);
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

	private reindexUser(user: User): void {
		if (user.username && user.firstName) {
			this.searchIndexService.indexUser(user).catch((err) => {
				this.logger.warn(`Failed to re-index user ${user.id}: ${err}`);
			});
		}
	}
}
