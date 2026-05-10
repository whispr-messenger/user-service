import { Test, TestingModule } from '@nestjs/testing';
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
		it('delegates to the service using req.user.sub as userId', async () => {
			const settings = { userId: 'user-1' } as PrivacySettings;
			service.getSettings.mockResolvedValue(settings);

			const result = await controller.getSettings(makeReq('user-1'));

			expect(result).toBe(settings);
			expect(service.getSettings).toHaveBeenCalledWith('user-1');
		});
	});

	describe('getSettingsByUserId', () => {
		it('returns the settings when userId matches the authenticated user', async () => {
			const settings = { userId: 'user-1' } as PrivacySettings;
			service.getSettings.mockResolvedValue(settings);

			const result = await controller.getSettingsByUserId('user-1', makeReq('user-1'));

			expect(result).toBe(settings);
			expect(service.getSettings).toHaveBeenCalledWith('user-1');
		});

		it('throws ForbiddenException when userId differs from the authenticated user', async () => {
			await expect(controller.getSettingsByUserId('user-2', makeReq('user-1'))).rejects.toThrow(
				'Cannot access another user privacy settings'
			);
			expect(service.getSettings).not.toHaveBeenCalled();
		});
	});

	describe('updateSettings', () => {
		it('delegates to the service using req.user.sub as userId', async () => {
			const dto: UpdatePrivacySettingsDto = {} as UpdatePrivacySettingsDto;
			const updated = { userId: 'user-1' } as PrivacySettings;
			service.updateSettings.mockResolvedValue(updated);

			const result = await controller.updateSettings(dto, makeReq('user-1'));

			expect(result).toBe(updated);
			expect(service.updateSettings).toHaveBeenCalledWith('user-1', dto);
		});
	});
});
