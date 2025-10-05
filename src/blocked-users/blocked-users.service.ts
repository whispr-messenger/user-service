import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockedUser, User, Contact } from '../entities';
import { BlockUserDto } from '../dto';

@Injectable()
export class BlockedUsersService {
  constructor(
    @InjectRepository(BlockedUser)
    private readonly blockedUserRepository: Repository<BlockedUser>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  async blockUser(
    userId: string,
    blockUserDto: BlockUserDto,
  ): Promise<BlockedUser> {
    // Vérifier que l'utilisateur ne se bloque pas lui-même
    if (userId === blockUserDto.blockedUserId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Vérifier que l'utilisateur à bloquer existe
    const userToBlock = await this.userRepository.findOne({
      where: { id: blockUserDto.blockedUserId },
    });
    if (!userToBlock) {
      throw new NotFoundException('User to block not found');
    }

    // Vérifier que l'utilisateur n'est pas déjà bloqué
    const existingBlock = await this.blockedUserRepository.findOne({
      where: {
        userId,
        blockedUserId: blockUserDto.blockedUserId,
      },
    });
    if (existingBlock) {
      throw new ConflictException('User is already blocked');
    }

    // Supprimer le contact s'il existe
    await this.contactRepository.delete({
      userId,
      contactId: blockUserDto.blockedUserId,
    });
    await this.contactRepository.delete({
      userId: blockUserDto.blockedUserId,
      contactId: userId,
    });

    const blockedUser = this.blockedUserRepository.create({
      userId,
      blockedUserId: blockUserDto.blockedUserId,
      reason: blockUserDto.reason,
    });

    return this.blockedUserRepository.save(blockedUser);
  }

  async getBlockedUsers(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ blockedUsers: BlockedUser[]; total: number }> {
    const [blockedUsers, total] = await this.blockedUserRepository.findAndCount(
      {
        where: { userId },
        relations: ['blockedUser'],
        skip: (page - 1) * limit,
        take: limit,
        order: { blockedAt: 'DESC' },
      },
    );

    return { blockedUsers, total };
  }

  async getBlockedUser(
    userId: string,
    blockedUserId: string,
  ): Promise<BlockedUser> {
    const blockedUser = await this.blockedUserRepository.findOne({
      where: {
        userId,
        blockedUserId,
      },
      relations: ['blockedUser'],
    });

    if (!blockedUser) {
      throw new NotFoundException('Blocked user not found');
    }

    return blockedUser;
  }

  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    const blockedUser = await this.getBlockedUser(userId, blockedUserId);
    await this.blockedUserRepository.remove(blockedUser);
  }

  async isUserBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const blockedUser = await this.blockedUserRepository.findOne({
      where: [
        { userId, blockedUserId: targetUserId },
        { userId: targetUserId, blockedUserId: userId },
      ],
    });

    return !!blockedUser;
  }

  async getBlockedUsersCount(userId: string): Promise<number> {
    return this.blockedUserRepository.count({
      where: { userId },
    });
  }

  async searchBlockedUsers(
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ blockedUsers: BlockedUser[]; total: number }> {
    const queryBuilder = this.blockedUserRepository
      .createQueryBuilder('blockedUser')
      .leftJoinAndSelect('blockedUser.blockedUser', 'user')
      .where('blockedUser.userId = :userId', { userId })
      .andWhere(
        '(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.username ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('blockedUser.blockedAt', 'DESC');

    const [blockedUsers, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { blockedUsers, total };
  }

  async updateBlockReason(
    userId: string,
    blockedUserId: string,
    reason: string,
  ): Promise<BlockedUser> {
    const blockedUser = await this.getBlockedUser(userId, blockedUserId);
    blockedUser.reason = reason;
    return this.blockedUserRepository.save(blockedUser);
  }

  async getBlockingUsers(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ blockingUsers: BlockedUser[]; total: number }> {
    const [blockingUsers, total] =
      await this.blockedUserRepository.findAndCount({
        where: { blockedUserId: userId },
        relations: ['user'],
        skip: (page - 1) * limit,
        take: limit,
        order: { blockedAt: 'DESC' },
      });

    return { blockingUsers, total };
  }
}
