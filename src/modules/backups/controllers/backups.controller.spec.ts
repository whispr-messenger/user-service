import { Test, TestingModule } from '@nestjs/testing';
import { BackupsController } from './backups.controller';
import { BackupsService } from '../services/backups.service';
import { UserBackup } from '../entities/user-backup.entity';
import { CreateBackupDto } from '../dto/create-backup.dto';

const makeReq = (sub: string) => ({ user: { sub } }) as any;

describe('BackupsController', () => {
	let controller: BackupsController;
	let service: jest.Mocked<BackupsService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [BackupsController],
			providers: [
				{
					provide: BackupsService,
					useValue: {
						create: jest.fn(),
						list: jest.fn(),
						get: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get(BackupsController);
		service = module.get(BackupsService);
	});

	describe('create', () => {
		it('delegates to the service with req.user.sub and the dto data', async () => {
			const dto: CreateBackupDto = { data: { hello: 'world' } };
			const backup = { id: 'backup-1' } as UserBackup;
			service.create.mockResolvedValue(backup);

			const result = await controller.create(dto, makeReq('user-1'));

			expect(result).toBe(backup);
			expect(service.create).toHaveBeenCalledWith('user-1', dto.data);
		});
	});

	describe('list', () => {
		it('delegates to the service with req.user.sub', async () => {
			const backups = [{ id: 'backup-1' }] as UserBackup[];
			service.list.mockResolvedValue(backups);

			const result = await controller.list(makeReq('user-1'));

			expect(result).toBe(backups);
			expect(service.list).toHaveBeenCalledWith('user-1');
		});
	});

	describe('get', () => {
		it('delegates to the service with the id and req.user.sub', async () => {
			const backup = { id: 'backup-1' } as UserBackup;
			service.get.mockResolvedValue(backup);

			const result = await controller.get('backup-1', makeReq('user-1'));

			expect(result).toBe(backup);
			expect(service.get).toHaveBeenCalledWith('user-1', 'backup-1');
		});
	});
});
