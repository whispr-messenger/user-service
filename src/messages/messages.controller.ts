import { Controller, Post, Body, Get, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SendMessageDto } from '../dto';
import { Message } from '../entities';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Envoyer un message' })
  @ApiResponse({ status: 201, description: 'Message envoyé', type: Message })
  async send(@Body() dto: SendMessageDto): Promise<Message> {
    return this.messagesService.sendMessage(dto);
  }

  @Get('conversation')
  @ApiOperation({ summary: 'Récupérer la conversation entre deux utilisateurs' })
  @ApiQuery({ name: 'userId1', required: true })
  @ApiQuery({ name: 'userId2', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Messages récupérés' })
  async conversation(
    @Query('userId1') userId1: string,
    @Query('userId2') userId2: string,
    @Query('limit') limit?: number,
  ): Promise<Message[]> {
    return this.messagesService.getConversation(userId1, userId2, limit ?? 50);
  }

  @Post(':id/read/:userId')
  @ApiOperation({ summary: 'Marquer un message comme lu' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  async markAsRead(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<Message> {
    return this.messagesService.markAsRead(id, userId);
  }
}