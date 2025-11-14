import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'ID de l’utilisateur expéditeur', format: 'uuid' })
  @IsUUID()
  senderId: string;

  @ApiProperty({ description: 'ID de l’utilisateur destinataire', format: 'uuid' })
  @IsUUID()
  recipientId: string;

  @ApiProperty({ description: 'Contenu du message' })
  @IsString()
  @MinLength(1)
  content: string;
}