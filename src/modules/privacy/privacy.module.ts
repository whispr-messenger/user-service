import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { PrivacySettings } from './entities/privacy-settings.entity';
import { PrivacySettingsRepository } from './repositories/privacy-settings.repository';
import { PrivacyService } from './services/privacy.service';
import { PrivacyController } from './controllers/privacy.controller';

@Module({
	imports: [CommonModule, TypeOrmModule.forFeature([PrivacySettings])],
	controllers: [PrivacyController],
	providers: [PrivacyService, PrivacySettingsRepository],
	exports: [PrivacyService],
})
export class PrivacyModule {}
