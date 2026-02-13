import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContactRequestStatus } from '../entities/contact-request.entity';

export class RespondToContactRequestDto {
  @ApiProperty({
    description: 'Response status (accepted or rejected)',
    enum: ContactRequestStatus,
    example: ContactRequestStatus.ACCEPTED,
  })
  @IsEnum(ContactRequestStatus)
  @IsNotEmpty()
  status: ContactRequestStatus;
}
