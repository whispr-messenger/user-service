import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivacyService } from './privacy.service';
import { PrivacyController } from './privacy.controller';
import { PrivacySettings, User, Contact, BlockedUser } from '../entities';

@Module({
	imports: [TypeOrmModule.forFeature([PrivacySettings, User, Contact, BlockedUser])],
	controllers: [PrivacyController],
	providers: [PrivacyService],
	exports: [PrivacyService],
})
export class PrivacyModule {}
