import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SeedAdminService } from './seed-admin.service';
import { RolesRepository } from '../repositories/roles.repository';

describe('SeedAdminService', () => {
	let service: SeedAdminService;
	let rolesRepository: jest.Mocked<RolesRepository>;
	let configService: jest.Mocked<ConfigService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SeedAdminService,
				{
					provide: RolesRepository,
					useValue: {
						upsert: jest.fn().mockResolvedValue(undefined),
					},
				},
				{
					provide: ConfigService,
					useValue: {
						get: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<SeedAdminService>(SeedAdminService);
		rolesRepository = module.get(RolesRepository);
		configService = module.get(ConfigService);
	});

	it('is a no-op when SEED_ADMIN_USER_IDS is unset', async () => {
		configService.get.mockReturnValue('');
		await service.onModuleInit();
		expect(rolesRepository.upsert).not.toHaveBeenCalled();
	});

	it('upserts admin role for each valid UUID in the list', async () => {
		const a = 'fab8817a-27a0-4537-89c1-be05f783150b';
		const b = '3378ee73-ce43-4145-b689-ba982d97721e';
		configService.get.mockReturnValue(`${a},${b}`);
		await service.onModuleInit();
		expect(rolesRepository.upsert).toHaveBeenCalledTimes(2);
		expect(rolesRepository.upsert).toHaveBeenCalledWith(a, 'admin', a);
		expect(rolesRepository.upsert).toHaveBeenCalledWith(b, 'admin', b);
	});

	it('trims whitespace and skips empty entries', async () => {
		const a = 'fab8817a-27a0-4537-89c1-be05f783150b';
		configService.get.mockReturnValue(` ${a} , ,  `);
		await service.onModuleInit();
		expect(rolesRepository.upsert).toHaveBeenCalledTimes(1);
		expect(rolesRepository.upsert).toHaveBeenCalledWith(a, 'admin', a);
	});

	it('ignores invalid UUIDs without throwing', async () => {
		const valid = 'fab8817a-27a0-4537-89c1-be05f783150b';
		configService.get.mockReturnValue(`not-a-uuid,${valid}`);
		await service.onModuleInit();
		expect(rolesRepository.upsert).toHaveBeenCalledTimes(1);
		expect(rolesRepository.upsert).toHaveBeenCalledWith(valid, 'admin', valid);
	});

	it('continues seeding other users when one upsert fails', async () => {
		const a = 'fab8817a-27a0-4537-89c1-be05f783150b';
		const b = '3378ee73-ce43-4145-b689-ba982d97721e';
		rolesRepository.upsert
			.mockRejectedValueOnce(new Error('db down'))
			.mockResolvedValueOnce(undefined as any);
		configService.get.mockReturnValue(`${a},${b}`);
		await expect(service.onModuleInit()).resolves.not.toThrow();
		expect(rolesRepository.upsert).toHaveBeenCalledTimes(2);
	});
});
