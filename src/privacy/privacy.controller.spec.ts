import { Test, TestingModule } from '@nestjs/testing';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { UpdatePrivacySettingsDto } from '../dto';
import { PrivacySettings, PrivacyLevel } from '../entities/privacy-settings.entity';

describe('PrivacyController', () => {
	let controller: PrivacyController;

	const mockPrivacySettings: PrivacySettings = {
		id: 'settings-id',
		userId: 'user-id',
		profilePhoto: PrivacyLevel.EVERYONE,
		lastSeen: PrivacyLevel.CONTACTS,
		status: PrivacyLevel.EVERYONE,
		readReceipts: true,
		groups: PrivacyLevel.EVERYONE,
		updatedAt: new Date(),
	} as unknown as PrivacySettings;

	const mockPrivacyService = {
		getPrivacySettings: jest.fn(),
		updatePrivacySettings: jest.fn(),
		canViewProfilePicture: jest.fn(),
		canViewFirstName: jest.fn(),
		canViewLastName: jest.fn(),
		canViewBiography: jest.fn(),
		canViewLastSeen: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [PrivacyController],
			providers: [
				{
					provide: PrivacyService,
					useValue: mockPrivacyService,
				},
			],
		}).compile();

		controller = module.get<PrivacyController>(PrivacyController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('getPrivacySettings', () => {
		it('should return privacy settings', async () => {
			mockPrivacyService.getPrivacySettings.mockResolvedValue(mockPrivacySettings);
			const result = await controller.getPrivacySettings('user-id');
			expect(result).toEqual(mockPrivacySettings);
			expect(mockPrivacyService.getPrivacySettings).toHaveBeenCalledWith('user-id');
		});
	});

	describe('updatePrivacySettings', () => {
		it('should update privacy settings', async () => {
			const dto: UpdatePrivacySettingsDto = { profilePicturePrivacy: PrivacyLevel.CONTACTS };
			const updatedSettings = { ...mockPrivacySettings, ...dto };
			mockPrivacyService.updatePrivacySettings.mockResolvedValue(updatedSettings);

			const result = await controller.updatePrivacySettings('user-id', dto);
			expect(result).toEqual(updatedSettings);
			expect(mockPrivacyService.updatePrivacySettings).toHaveBeenCalledWith('user-id', dto);
		});
	});

	describe('canViewProfilePicture', () => {
		it('should return true if allowed', async () => {
			mockPrivacyService.canViewProfilePicture.mockResolvedValue(true);
			const result = await controller.canViewProfilePicture('user-id', 'viewer-id');
			expect(result).toBe(true);
			expect(mockPrivacyService.canViewProfilePicture).toHaveBeenCalledWith('viewer-id', 'user-id');
		});
	});

	describe('canViewFirstName', () => {
		it('should return true if allowed', async () => {
			mockPrivacyService.canViewFirstName.mockResolvedValue(true);
			const result = await controller.canViewFirstName('user-id', 'viewer-id');
			expect(result).toBe(true);
			expect(mockPrivacyService.canViewFirstName).toHaveBeenCalledWith('viewer-id', 'user-id');
		});
	});

	describe('canViewLastName', () => {
		it('should return true if allowed', async () => {
			mockPrivacyService.canViewLastName.mockResolvedValue(true);
			const result = await controller.canViewLastName('user-id', 'viewer-id');
			expect(result).toBe(true);
			expect(mockPrivacyService.canViewLastName).toHaveBeenCalledWith('viewer-id', 'user-id');
		});
	});

	describe('canViewBiography', () => {
		it('should return true if allowed', async () => {
			mockPrivacyService.canViewBiography.mockResolvedValue(true);
			const result = await controller.canViewBiography('user-id', 'viewer-id');
			expect(result).toBe(true);
			expect(mockPrivacyService.canViewBiography).toHaveBeenCalledWith('viewer-id', 'user-id');
		});
	});

	describe('canViewLastSeen', () => {
		it('should return true if allowed', async () => {
			mockPrivacyService.canViewLastSeen.mockResolvedValue(true);
			const result = await controller.canViewLastSeen('user-id', 'viewer-id');
			expect(result).toBe(true);
			expect(mockPrivacyService.canViewLastSeen).toHaveBeenCalledWith('viewer-id', 'user-id');
		});
	});
});
