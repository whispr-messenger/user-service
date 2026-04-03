import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly client: Twilio.Twilio;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.client = Twilio(accountSid, authToken);
  }

  async sendSms(to: string, body: string) {
    return this.client.messages.create({
      to,
      from: this.configService.get<string>('TWILIO_PHONE_NUMBER'),
      body,
    });
  }
}
