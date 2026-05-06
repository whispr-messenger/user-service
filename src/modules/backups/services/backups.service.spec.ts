import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { BackupsService, BACKUP_UPLOAD_COOLDOWN_MS } from './backups.service';
import { UserRepository } from '../../common/repositories';
import { UserBackupRepository } from '../repositories/user-backup.repository';
import { UserBackup } from '../entities/user-backup.entity';
import { User } from '../../common/entities/user.entity';
import { MessagingClientService } from './messaging-client.service';

const mockUser = (): User => ({ id: 'user-1' }) as User;

const mockBackup = (overrides: Partial<UserBackup> = {}): UserBackup =>
	({
		id: 'backup-1',
		userId: 'user-1',
		data: { foo: 'bar' },
		sizeBytes: 10,
		createdAt: new Date(),
		...overrides,
	}) as UserBackup;

describe('BackupsService', () => {
	let service: BackupsService;
	let userRepository: jest.Mocked<UserRepository>;
	let userBackupRepository: jest.Mocked<UserBackupRepository>;
	let messagingClient: jest.Mocked<MessagingClientService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				BackupsService,
				{
					provide: UserRepository,
					useValue: { findById: jest.fn() },
				},
				{
					provide: UserBackupRepository,
					useValue: {
						create: jest.fn(),
						findLatestForUser: jest.fn(),
						listByUser: jest.fn(),
						findByIdForUser: jest.fn(),
					},
				},
				{
					provide: MessagingClientService,
					useValue: { restoreBackup: jest.fn() },
				},
			],
		}).compile();

		service = module.get(BackupsService);
		userRepository = module.get(UserRepository);
		userBackupRepository = module.get(UserBackupRepository);
		messagingClient = module.get(MessagingClientService);
	});

	describe('create', () => {
		it('persists the backup and computes the size', async () => {
			const user = mockUser();
			userRepository.findById.mockResolvedValue(user);
			userBackupRepository.findLatestForUser.mockResolvedValue(null);
			const created = mockBackup();
			userBackupRepository.create.mockResolvedValue(created);

			const payload = { hello: 'world' };
			const result = await service.create('user-1', payload);

			expect(result).toBe(created);
			const expectedSize = Buffer.byteLength(JSON.stringify(payload), 'utf8');
			expect(userBackupRepository.create).toHaveBeenCalledWith('user-1', payload, expectedSize);
		});

		it('throws NotFoundException when the user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.create('user-1', { a: 1 })).rejects.toThrow(NotFoundException);
			expect(userBackupRepository.create).not.toHaveBeenCalled();
		});

		it('rejects payloads that exceed the max size with 413', async () => {
			userRepository.findById.mockResolvedValue(mockUser());

			// 10MB+1 byte string
			const huge = { blob: 'a'.repeat(10 * 1024 * 1024 + 1) };

			await expect(service.create('user-1', huge)).rejects.toMatchObject({
				status: HttpStatus.PAYLOAD_TOO_LARGE,
			});
			expect(userBackupRepository.create).not.toHaveBeenCalled();
		});

		it('rejects with 429 when a backup was uploaded within the cooldown window', async () => {
			userRepository.findById.mockResolvedValue(mockUser());
			const recent = mockBackup({ createdAt: new Date(Date.now() - 1000) });
			userBackupRepository.findLatestForUser.mockResolvedValue(recent);

			await expect(service.create('user-1', { a: 1 })).rejects.toBeInstanceOf(HttpException);
			await expect(service.create('user-1', { a: 1 })).rejects.toMatchObject({
				status: HttpStatus.TOO_MANY_REQUESTS,
			});
			expect(userBackupRepository.create).not.toHaveBeenCalled();
		});

		it('allows a new backup once the cooldown window has elapsed', async () => {
			userRepository.findById.mockResolvedValue(mockUser());
			const old = mockBackup({
				createdAt: new Date(Date.now() - BACKUP_UPLOAD_COOLDOWN_MS - 1000),
			});
			userBackupRepository.findLatestForUser.mockResolvedValue(old);
			const created = mockBackup({ id: 'backup-2' });
			userBackupRepository.create.mockResolvedValue(created);

			const result = await service.create('user-1', { a: 1 });

			expect(result).toBe(created);
		});
	});

	describe('list', () => {
		it('returns backups for the user', async () => {
			userRepository.findById.mockResolvedValue(mockUser());
			const list = [mockBackup()];
			userBackupRepository.listByUser.mockResolvedValue(list);

			const result = await service.list('user-1');

			expect(result).toBe(list);
			expect(userBackupRepository.listByUser).toHaveBeenCalledWith('user-1');
		});

		it('throws NotFoundException when the user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.list('user-1')).rejects.toThrow(NotFoundException);
		});
	});

	describe('get', () => {
		it('returns the backup when owned by the user', async () => {
			userRepository.findById.mockResolvedValue(mockUser());
			const backup = mockBackup();
			userBackupRepository.findByIdForUser.mockResolvedValue(backup);

			const result = await service.get('user-1', 'backup-1');

			expect(result).toBe(backup);
			expect(userBackupRepository.findByIdForUser).toHaveBeenCalledWith('backup-1', 'user-1');
		});

		it('throws NotFoundException when the backup does not exist for the user', async () => {
			userRepository.findById.mockResolvedValue(mockUser());
			userBackupRepository.findByIdForUser.mockResolvedValue(null);

			await expect(service.get('user-1', 'backup-1')).rejects.toThrow(NotFoundException);
		});
	});

	describe('restore', () => {
		it('forwards the backup payload to the messaging-service and returns the accepted status', async () => {
			userRepository.findById.mockResolvedValue(mockUser());
			const backup = mockBackup();
			userBackupRepository.findByIdForUser.mockResolvedValue(backup);
			messagingClient.restoreBackup.mockResolvedValue(undefined);

			const result = await service.restore('user-1', 'backup-1');

			expect(messagingClient.restoreBackup).toHaveBeenCalledWith({
				userId: 'user-1',
				backupId: backup.id,
				data: backup.data,
			});
			expect(result).toEqual({ status: 'accepted', backupId: backup.id });
		});

		it('throws NotFoundException when the backup does not belong to the user', async () => {
			userRepository.findById.mockResolvedValue(mockUser());
			userBackupRepository.findByIdForUser.mockResolvedValue(null);

			await expect(service.restore('user-1', 'backup-1')).rejects.toThrow(NotFoundException);
			expect(messagingClient.restoreBackup).not.toHaveBeenCalled();
		});
	});
});
