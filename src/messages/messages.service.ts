import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageStatus, User, BlockedUser, Contact } from '../entities';
import { SendMessageDto } from '../dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(BlockedUser) private readonly blockedUserRepository: Repository<BlockedUser>,
    @InjectRepository(Contact) private readonly contactRepository: Repository<Contact>,
  ) {}

  async sendMessage(dto: SendMessageDto): Promise<Message> {
    const { senderId, recipientId, content } = dto;

    if (senderId === recipientId) {
      throw new BadRequestException('Impossible d’envoyer un message à soi-même');
    }

    const [sender, recipient] = await Promise.all([
      this.userRepository.findOne({ where: { id: senderId, isActive: true } }),
      this.userRepository.findOne({ where: { id: recipientId, isActive: true } }),
    ]);

    if (!sender) throw new NotFoundException('Expéditeur introuvable');
    if (!recipient) throw new NotFoundException('Destinataire introuvable');

    // Vérifier si bloqué dans un sens ou l'autre
    const isBlocked = await this.blockedUserRepository.findOne({
      where: [
        { userId: senderId, blockedUserId: recipientId },
        { userId: recipientId, blockedUserId: senderId },
      ],
    });
    if (isBlocked) {
      throw new ForbiddenException('La communication est bloquée entre ces utilisateurs');
    }

    // Optionnel: exiger un contact
    const contact = await this.contactRepository.findOne({
      where: [
        { userId: senderId, contactId: recipientId },
        { userId: recipientId, contactId: senderId },
      ],
    });
    if (!contact) {
      // On autorise pour POC, mais on pourrait forcer l’ajout de contact
    }

    const message = this.messageRepository.create({
      senderId,
      recipientId,
      content,
      status: MessageStatus.SENT,
    });

    return this.messageRepository.save(message);
  }

  async getConversation(userId1: string, userId2: string, limit = 50): Promise<Message[]> {
    // Vérifier l’existence des utilisateurs
    const [u1, u2] = await Promise.all([
      this.userRepository.findOne({ where: { id: userId1, isActive: true } }),
      this.userRepository.findOne({ where: { id: userId2, isActive: true } }),
    ]);
    if (!u1 || !u2) throw new NotFoundException('Utilisateur introuvable');

    return this.messageRepository
      .createQueryBuilder('message')
      .where(
        '(message.senderId = :userId1 AND message.recipientId = :userId2) OR (message.senderId = :userId2 AND message.recipientId = :userId1)',
        { userId1, userId2 },
      )
      .orderBy('message.createdAt', 'ASC')
      .limit(limit)
      .getMany();
  }

  async markAsRead(messageId: string, userId: string): Promise<Message> {
    const msg = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message introuvable');
    if (msg.recipientId !== userId) throw new ForbiddenException('Seul le destinataire peut marquer le message comme lu');

    msg.readAt = new Date();
    msg.status = MessageStatus.READ;
    return this.messageRepository.save(msg);
  }
}