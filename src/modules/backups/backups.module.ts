import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { UserBackup } from './entities/user-backup.entity';
import { UserBackupRepository } from './repositories/user-backup.repository';
import { BackupsService } from './services/backups.service';
import { MessagingClientService } from './services/messaging-client.service';
import { BackupsController } from './controllers/backups.controller';

@Module({
	imports: [CommonModule, TypeOrmModule.forFeature([UserBackup])],
	controllers: [BackupsController],
	providers: [BackupsService, UserBackupRepository, MessagingClientService],
	exports: [BackupsService],
})
export class BackupsModule {}
