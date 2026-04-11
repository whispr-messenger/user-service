import { Test, TestingModule } from '@nestjs/testing';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from '../services/privacy.service';
import { PrivacySettings } from '../entities/privacy-settings.entity';
import { UpdatePrivacySettingsDto } from '../dto/update-privacy-settings.dto';

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

			const result = await controller.getSettings('user-1');

			expect(result).toBe(settings);
			expect(service.getSettings).toHaveBeenCalledWith('user-1');
		});
	});

	describe('updateSettings', () => {
		it('delegates to the service', async () => {
			const dto: UpdatePrivacySettingsDto = {} as UpdatePrivacySettingsDto;
			const updated = { userId: 'user-1' } as PrivacySettings;
			service.updateSettings.mockResolvedValue(updated);

			const result = await controller.updateSettings('user-1', dto);

			expect(result).toBe(updated);
			expect(service.updateSettings).toHaveBeenCalledWith('user-1', dto);
		});
	});
});
