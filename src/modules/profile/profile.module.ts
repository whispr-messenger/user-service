import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { UserSearchModule } from '../search/user-search.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { ContactsModule } from '../contacts/contacts.module';
import { ProfileController } from './controllers/profile.controller';
import { ProfileService } from './services/profile.service';
import { MediaClientService } from './services/media-client.service';

@Module({
	imports: [CommonModule, UserSearchModule, PrivacyModule, ContactsModule],
	controllers: [ProfileController],
	providers: [ProfileService, MediaClientService],
	exports: [ProfileService],
})
export class ProfileModule {}
