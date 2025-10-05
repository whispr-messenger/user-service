import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { User, PrivacySettings } from '../entities';
import { SearchIndexService } from '../cache';
import { PrivacyService } from '../privacy/privacy.service';

export interface UserSearchResult {
  id: string;
  phoneNumber?: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  isActive: boolean;
  canViewProfile: boolean;
  canViewPhoneNumber: boolean;
  canViewFirstName: boolean;
  canViewLastName: boolean;
}

export interface SearchOptions {
  viewerId?: string;
  limit?: number;
  offset?: number;
  includeInactive?: boolean;
}

@Injectable()
export class UserSearchService {
  private readonly logger = new Logger(UserSearchService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PrivacySettings)
    private privacyRepository: Repository<PrivacySettings>,
    private searchIndexService: SearchIndexService,
    private privacyService: PrivacyService,
  ) {}

  /**
   * Search user by phone number
   */
  async searchByPhoneNumber(
    phoneNumber: string,
    options: SearchOptions = {},
  ): Promise<UserSearchResult | null> {
    try {
      // First try Redis cache
      const cachedUserId =
        await this.searchIndexService.searchByPhoneNumber(phoneNumber);

      let user: User | null = null;

      if (cachedUserId) {
        // Get from cache first
        const cachedUser =
          await this.searchIndexService.getCachedUser(cachedUserId);
        if (cachedUser && (options.includeInactive || cachedUser.isActive)) {
          user = await this.userRepository.findOne({
            where: { id: cachedUserId },
            relations: ['privacySettings'],
          });
        }
      }

      // Fallback to database if not in cache
      if (!user) {
        user = await this.userRepository.findOne({
          where: {
            phoneNumber,
            ...(options.includeInactive ? {} : { isActive: true }),
          },
          relations: ['privacySettings'],
        });

        // Update cache if found
        if (user) {
          await this.searchIndexService.indexUser(user);
        }
      }

      if (!user) {
        return null;
      }

      return await this.formatUserSearchResult(user, options.viewerId);
    } catch (error) {
      this.logger.error(
        `Failed to search by phone number ${phoneNumber}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Search user by username
   */
  async searchByUsername(
    username: string,
    options: SearchOptions = {},
  ): Promise<UserSearchResult | null> {
    try {
      // First try Redis cache
      const cachedUserId =
        await this.searchIndexService.searchByUsername(username);

      let user: User | null = null;

      if (cachedUserId) {
        // Get from cache first
        const cachedUser =
          await this.searchIndexService.getCachedUser(cachedUserId);
        if (cachedUser && (options.includeInactive || cachedUser.isActive)) {
          user = await this.userRepository.findOne({
            where: { id: cachedUserId },
            relations: ['privacySettings'],
          });
        }
      }

      // Fallback to database if not in cache
      if (!user) {
        user = await this.userRepository.findOne({
          where: {
            username: ILike(username),
            ...(options.includeInactive ? {} : { isActive: true }),
          },
          relations: ['privacySettings'],
        });

        // Update cache if found
        if (user) {
          await this.searchIndexService.indexUser(user);
        }
      }

      if (!user) {
        return null;
      }

      return await this.formatUserSearchResult(user, options.viewerId);
    } catch (error) {
      this.logger.error(`Failed to search by username ${username}:`, error);
      throw error;
    }
  }

  /**
   * Search users by name (first name, last name, or full name)
   */
  async searchByName(
    query: string,
    options: SearchOptions = {},
  ): Promise<UserSearchResult[]> {
    try {
      const limit = options.limit || 20;
      const offset = options.offset || 0;

      // First try Redis cache
      const cachedUserIds = await this.searchIndexService.searchByName(
        query,
        limit + offset,
      );

      let users: User[] = [];

      if (cachedUserIds.length > 0) {
        // Try to resolve users directly from the repository using cached ids
        const slice = cachedUserIds.slice(offset, offset + limit);
        const found = await this.userRepository.find({
          where: { id: In(slice) as any },
          relations: ['privacySettings'],
        });

        users = found.filter((u) => options.includeInactive || u.isActive);
      }

      // Fallback to database search if not enough results from cache
      if (users.length < limit) {
        const remainingLimit = limit - users.length;
        const existingIds = users.map((u) => u.id);

        const dbUsers = await this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.privacySettings', 'privacySettings')
          .where(
            '(LOWER(user.firstName) LIKE LOWER(:query) OR ' +
              'LOWER(user.lastName) LIKE LOWER(:query) OR ' +
              "LOWER(CONCAT(user.firstName, ' ', user.lastName)) LIKE LOWER(:query))",
            { query: `%${query}%` },
          )
          .andWhere('user.id NOT IN (:...existingIds)', {
            existingIds: existingIds.length > 0 ? existingIds : [''],
          })
          .andWhere(options.includeInactive ? '1=1' : 'user.isActive = true')
          .take(remainingLimit)
          .skip(offset)
          .getMany();

        users.push(...dbUsers);

        // Update cache for newly found users using available index methods
        if (dbUsers.length > 0) {
          await Promise.all(
            dbUsers.map((u) => this.searchIndexService.indexUser(u)),
          );
        }
      }

      // Format results with privacy filtering
      const resultPromises = users.map((user) =>
        this.formatUserSearchResult(user, options.viewerId),
      );

      return await Promise.all(resultPromises);
    } catch (error) {
      this.logger.error(`Failed to search by name ${query}:`, error);
      throw error;
    }
  }

  /**
   * Advanced search with multiple criteria
   */
  async advancedSearch(
    criteria: {
      phoneNumber?: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
    },
    options: SearchOptions = {},
  ): Promise<UserSearchResult[]> {
    try {
      const limit = options.limit || 20;
      const offset = options.offset || 0;

      const queryBuilder = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.privacySettings', 'privacySettings')
        .where(options.includeInactive ? '1=1' : 'user.isActive = true');

      if (criteria.phoneNumber) {
        queryBuilder.andWhere('user.phoneNumber LIKE :phoneNumber', {
          phoneNumber: `%${criteria.phoneNumber}%`,
        });
      }

      if (criteria.username) {
        queryBuilder.andWhere('LOWER(user.username) LIKE LOWER(:username)', {
          username: `%${criteria.username}%`,
        });
      }

      if (criteria.firstName) {
        queryBuilder.andWhere('LOWER(user.firstName) LIKE LOWER(:firstName)', {
          firstName: `%${criteria.firstName}%`,
        });
      }

      if (criteria.lastName) {
        queryBuilder.andWhere('LOWER(user.lastName) LIKE LOWER(:lastName)', {
          lastName: `%${criteria.lastName}%`,
        });
      }

      if (criteria.fullName) {
        queryBuilder.andWhere(
          "LOWER(CONCAT(user.firstName, ' ', user.lastName)) LIKE LOWER(:fullName)",
          { fullName: `%${criteria.fullName}%` },
        );
      }

      const users = await queryBuilder.take(limit).skip(offset).getMany();

      // Update cache for found users
      if (users.length > 0) {
        await Promise.all(
          users.map((u) => this.searchIndexService.indexUser(u)),
        );
      }

      // Format results with privacy filtering
      const resultPromises = users.map((user) =>
        this.formatUserSearchResult(user, options.viewerId),
      );

      return await Promise.all(resultPromises);
    } catch (error) {
      this.logger.error('Failed to perform advanced search:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions based on partial input
   */
  async getSearchSuggestions(
    query: string,
    options: SearchOptions = {},
  ): Promise<string[]> {
    try {
      const limit = options.limit || 10;

      // Get suggestions from database
      const suggestions = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.username', 'user.firstName', 'user.lastName'])
        .where(
          '(LOWER(user.username) LIKE LOWER(:query) OR ' +
            'LOWER(user.firstName) LIKE LOWER(:query) OR ' +
            'LOWER(user.lastName) LIKE LOWER(:query))',
          { query: `${query}%` },
        )
        .andWhere(options.includeInactive ? '1=1' : 'user.isActive = true')
        .take(limit)
        .getMany();

      const suggestionSet = new Set<string>();

      suggestions.forEach((user) => {
        if (user.username.toLowerCase().startsWith(query.toLowerCase())) {
          suggestionSet.add(user.username);
        }
        if (user.firstName.toLowerCase().startsWith(query.toLowerCase())) {
          suggestionSet.add(user.firstName);
        }
        if (user.lastName.toLowerCase().startsWith(query.toLowerCase())) {
          suggestionSet.add(user.lastName);
        }
        const fullName = `${user.firstName} ${user.lastName}`;
        if (fullName.toLowerCase().startsWith(query.toLowerCase())) {
          suggestionSet.add(fullName);
        }
      });

      return Array.from(suggestionSet).slice(0, limit);
    } catch (error) {
      this.logger.error(
        `Failed to get search suggestions for ${query}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Rebuild search indexes for all users
   */
  async rebuildSearchIndexes(): Promise<void> {
    try {
      this.logger.log('Starting search index rebuild...');

      // Rebuild flow: clear existing indexes then re-index all users
      await this.searchIndexService.clearAllIndexes();

      // Fetch all users (including inactive?) - reindexing typically covers active users
      const allUsers = await this.userRepository.find();
      if (allUsers.length > 0) {
        // Use batch operation from SearchIndexService for efficiency
        await this.searchIndexService.batchIndexUsers(allUsers);
      }

      this.logger.log(
        'Search index rebuilt using SearchIndexService batch utilities',
      );
    } catch (error) {
      this.logger.error('Failed to rebuild search indexes:', error);
      throw error;
    }
  }

  /**
   * Format user search result with privacy filtering
   */
  private async formatUserSearchResult(
    user: User,
    viewerId?: string,
  ): Promise<UserSearchResult> {
    const canViewProfile = viewerId
      ? await this.privacyService.canViewProfilePicture(user.id, viewerId)
      : false;
    const canViewPhoneNumber = viewerId
      ? await this.privacyService.canViewProfilePicture(user.id, viewerId)
      : false; // Assuming same privacy level
    const canViewFirstName = viewerId
      ? await this.privacyService.canViewFirstName(user.id, viewerId)
      : false;
    const canViewLastName = viewerId
      ? await this.privacyService.canViewLastName(user.id, viewerId)
      : false;

    return {
      id: user.id,
      phoneNumber: canViewPhoneNumber ? user.phoneNumber : undefined,
      username: user.username,
      firstName: canViewFirstName ? user.firstName : 'Hidden',
      lastName: canViewLastName ? user.lastName : 'Hidden',
      profilePictureUrl: canViewProfile ? user.profilePictureUrl : undefined,
      isActive: user.isActive,
      canViewProfile,
      canViewPhoneNumber,
      canViewFirstName,
      canViewLastName,
    };
  }
}
