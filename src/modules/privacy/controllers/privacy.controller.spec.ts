import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from '../services/privacy.service';
import { PrivacySettings } from '../entities/privacy-settings.entity';
import { UpdatePrivacySettingsDto } from '../dto/update-privacy-settings.dto';

const makeReq = (sub: string) => ({ user: { sub } }) as any;

describe('PrivacyController', () => {
	let controller: PrivacyController;
	let service: jest.Mocked<PrivacyService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [PrivacyController],
			providers: [
				{
					provide: PrivacyService,
					useValue: {
						getSettings: jest.fn(),
						updateSettings: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<PrivacyController>(PrivacyController);
		service = module.get(PrivacyService);
	});

	describe('getSettings', () => {
		it('delegates to the service', async () => {
			const settings = { userId: 'user-1' } as PrivacySettings;
			service.getSettings.mockResolvedValue(settings);

			const result = await controller.getSettings('user-1', makeReq('user-1'));

			expect(result).toBe(settings);
			expect(service.getSettings).toHaveBeenCalledWith('user-1');
		});

		it('throws ForbiddenException when caller is not the owner', async () => {
			await expect(controller.getSettings('user-1', makeReq('attacker'))).rejects.toThrow(
				ForbiddenException
			);
		});
	});

	describe('updateSettings', () => {
		it('delegates to the service', async () => {
			const dto: UpdatePrivacySettingsDto = {} as UpdatePrivacySettingsDto;
			const updated = { userId: 'user-1' } as PrivacySettings;
			service.updateSettings.mockResolvedValue(updated);

			const result = await controller.updateSettings('user-1', dto, makeReq('user-1'));

			expect(result).toBe(updated);
			expect(service.updateSettings).toHaveBeenCalledWith('user-1', dto);
		});

		it('throws ForbiddenException when caller is not the owner', async () => {
			const dto: UpdatePrivacySettingsDto = {} as UpdatePrivacySettingsDto;
			await expect(controller.updateSettings('user-1', dto, makeReq('attacker'))).rejects.toThrow(
				ForbiddenException
			);
		});
	});
});
