import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { ContactsModule } from '../contacts/contacts.module';
import { BlockedUsersModule } from '../blocked-users/blocked-users.module';
import { ProfileController } from './controllers/profile.controller';
import { ProfileService } from './services/profile.service';

@Module({
	imports: [CommonModule, PrivacyModule, ContactsModule, BlockedUsersModule],
	controllers: [ProfileController],
	providers: [ProfileService],
	exports: [ProfileService],
})
export class ProfileModule {}
