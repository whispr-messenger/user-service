import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsModule } from '../contacts/contacts.module';
import { BlockedUsersModule } from '../blocked-users/blocked-users.module';
import { CommonModule } from '../common/common.module';
import { PrivacySettings } from '../privacy/entities/privacy-settings.entity';
import { PrivacySettingsRepository } from '../privacy/repositories/privacy-settings.repository';
import { InternalAuthGuard } from './internal-auth.guard';
import { InternalContactsController } from './contacts/internal-contacts.controller';
import { InternalContactsService } from './contacts/internal-contacts.service';
import { InternalPrivacyController } from './privacy/internal-privacy.controller';
import { InternalPrivacyService } from './privacy/internal-privacy.service';

@Module({
	imports: [ContactsModule, BlockedUsersModule, CommonModule, TypeOrmModule.forFeature([PrivacySettings])],
	controllers: [InternalContactsController, InternalPrivacyController],
	providers: [
		InternalAuthGuard,
		InternalContactsService,
		InternalPrivacyService,
		PrivacySettingsRepository,
	],
})
export class InternalModule {}
