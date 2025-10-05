/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivacySettings, PrivacyLevel, User } from '../entities';
import { UpdatePrivacySettingsDto } from '../dto';

@Injectable()
export class PrivacyService {
  constructor(
    @InjectRepository(PrivacySettings)
    private readonly privacySettingsRepository: Repository<PrivacySettings>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    const privacySettings = await this.privacySettingsRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!privacySettings) {
      throw new NotFoundException('Privacy settings not found');
    }

    return privacySettings;
  }

  async updatePrivacySettings(
    userId: string,
    updatePrivacySettingsDto: UpdatePrivacySettingsDto,
  ): Promise<PrivacySettings> {
    const privacySettings = await this.getPrivacySettings(userId);

    Object.assign(privacySettings, updatePrivacySettingsDto);
    return this.privacySettingsRepository.save(privacySettings);
  }

  async canViewProfilePicture(
    viewerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    if (viewerId === targetUserId) {
      return true;
    }

    const privacySettings = await this.getPrivacySettings(targetUserId);
    return this.checkPrivacyLevel(
      privacySettings.profilePicturePrivacy,
      viewerId,
      targetUserId,
    );
  }

  async canViewFirstName(
    viewerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    if (viewerId === targetUserId) {
      return true;
    }

    const privacySettings = await this.getPrivacySettings(targetUserId);
    return this.checkPrivacyLevel(
      privacySettings.firstNamePrivacy,
      viewerId,
      targetUserId,
    );
  }

  async canViewLastName(
    viewerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    if (viewerId === targetUserId) {
      return true;
    }

    const privacySettings = await this.getPrivacySettings(targetUserId);
    return this.checkPrivacyLevel(
      privacySettings.lastNamePrivacy,
      viewerId,
      targetUserId,
    );
  }

  async canViewBiography(
    viewerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    if (viewerId === targetUserId) {
      return true;
    }

    const privacySettings = await this.getPrivacySettings(targetUserId);
    return this.checkPrivacyLevel(
      privacySettings.biographyPrivacy,
      viewerId,
      targetUserId,
    );
  }

  async canViewLastSeen(
    viewerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    if (viewerId === targetUserId) {
      return true;
    }

    const privacySettings = await this.getPrivacySettings(targetUserId);
    return this.checkPrivacyLevel(
      privacySettings.lastSeenPrivacy,
      viewerId,
      targetUserId,
    );
  }

  async canSearchByPhone(targetUserId: string): Promise<boolean> {
    const privacySettings = await this.getPrivacySettings(targetUserId);
    return privacySettings.searchByPhone;
  }

  async canSearchByUsername(targetUserId: string): Promise<boolean> {
    const privacySettings = await this.getPrivacySettings(targetUserId);
    return privacySettings.searchByUsername;
  }

  async shouldSendReadReceipts(userId: string): Promise<boolean> {
    const privacySettings = await this.getPrivacySettings(userId);
    return privacySettings.readReceipts;
  }

  async filterUserData(
    viewerId: string,
    targetUser: User,
  ): Promise<Partial<User>> {
    const filteredUser: Partial<User> = {
      id: targetUser.id,
      username: targetUser.username,
      createdAt: targetUser.createdAt,
      isActive: targetUser.isActive,
    };

    // Vérifier les permissions pour chaque champ
    if (await this.canViewProfilePicture(viewerId, targetUser.id)) {
      filteredUser.profilePictureUrl = targetUser.profilePictureUrl;
    }

    if (await this.canViewFirstName(viewerId, targetUser.id)) {
      filteredUser.firstName = targetUser.firstName;
    }

    if (await this.canViewLastName(viewerId, targetUser.id)) {
      filteredUser.lastName = targetUser.lastName;
    }

    if (await this.canViewBiography(viewerId, targetUser.id)) {
      filteredUser.biography = targetUser.biography;
    }

    if (await this.canViewLastSeen(viewerId, targetUser.id)) {
      filteredUser.lastSeen = targetUser.lastSeen;
    }

    return filteredUser;
  }

  private async checkPrivacyLevel(
    privacyLevel: PrivacyLevel,
    viewerId: string,
    targetUserId: string,
  ): Promise<boolean> {
    switch (privacyLevel) {
      case PrivacyLevel.EVERYONE:
        return true;

      case PrivacyLevel.CONTACTS:
        return this.areUsersContacts(viewerId, targetUserId);

      case PrivacyLevel.NOBODY:
        return false;

      default:
        return false;
    }
  }

  private async areUsersContacts(
    userId1: string,
    userId2: string,
  ): Promise<boolean> {
    // Placeholder implementation until Contacts module is available.
    // Use the parameters in a no-op conditional so linters consider them used.
    if (userId1 || userId2) {
      // intentionally empty
    }
    return false;
  }
}
