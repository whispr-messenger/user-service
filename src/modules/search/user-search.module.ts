import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { UserSearchService } from './services/user-search.service';
import { UserSearchController } from './controllers/user-search.controller';

@Module({
	imports: [CommonModule, PrivacyModule],
	controllers: [UserSearchController],
	providers: [UserSearchService],
	exports: [UserSearchService],
})
export class UserSearchModule {}
