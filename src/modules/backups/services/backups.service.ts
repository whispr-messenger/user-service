import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { UserRepository } from '../../common/repositories';
import { UserBackupRepository } from '../repositories/user-backup.repository';
import { UserBackup } from '../entities/user-backup.entity';

export const BACKUP_MAX_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class BackupsService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly userBackupRepository: UserBackupRepository
	) {}

	private async ensureUserExists(userId: string): Promise<void> {
		const user = await this.userRepository.findById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
	}

	async create(userId: string, data: Record<string, unknown>): Promise<UserBackup> {
		await this.ensureUserExists(userId);

		const serialized = JSON.stringify(data);
		const sizeBytes = Buffer.byteLength(serialized, 'utf8');

		if (sizeBytes > BACKUP_MAX_SIZE_BYTES) {
			throw new HttpException('Backup payload exceeds the maximum allowed size', HttpStatus.PAYLOAD_TOO_LARGE);
		}

		return this.userBackupRepository.create(userId, data, sizeBytes);
	}

	async list(userId: string): Promise<UserBackup[]> {
		await this.ensureUserExists(userId);
		return this.userBackupRepository.listByUser(userId);
	}

	async get(userId: string, backupId: string): Promise<UserBackup> {
		await this.ensureUserExists(userId);
		const backup = await this.userBackupRepository.findByIdForUser(backupId, userId);
		if (!backup) {
			throw new NotFoundException('Backup not found');
		}
		return backup;
	}
}
