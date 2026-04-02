import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrivacyService } from './privacy.service';
import { UserRepository } from '../../common/repositories';
import { PrivacySettingsRepository } from '../repositories/privacy-settings.repository';
import { PrivacySettings, PrivacyLevel, MediaAutoDownload } from '../entities/privacy-settings.entity';
import { UpdatePrivacySettingsDto } from '../dto/update-privacy-settings.dto';
import { User } from '../../common/entities/user.entity';

const mockUser = (): User =>
	({
		id: 'uuid-1',
		phoneNumber: '+33600000001',
		username: null,
		firstName: null,
		lastName: null,
		biography: null,
		profilePictureUrl: null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	}) as User;

const mockSettings = (): PrivacySettings =>
	({
		id: 'settings-uuid-1',
		userId: 'uuid-1',
		profilePicturePrivacy: PrivacyLevel.EVERYONE,
		firstNamePrivacy: PrivacyLevel.EVERYONE,
		lastNamePrivacy: PrivacyLevel.CONTACTS,
		biographyPrivacy: PrivacyLevel.EVERYONE,
		lastSeenPrivacy: PrivacyLevel.CONTACTS,
		searchByPhone: true,
		searchByUsername: true,
		readReceipts: true,
		onlineStatus: PrivacyLevel.CONTACTS,
		groupAddPermission: PrivacyLevel.CONTACTS,
		mediaAutoDownload: MediaAutoDownload.WIFI_ONLY,
		createdAt: new Date(),
		updatedAt: new Date(),
	}) as PrivacySettings;

describe('PrivacyService', () => {
	let service: PrivacyService;
	let userRepository: jest.Mocked<UserRepository>;
	let privacySettingsRepository: jest.Mocked<PrivacySettingsRepository>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PrivacyService,
				{
					provide: UserRepository,
					useValue: {
						findById: jest.fn(),
					},
				},
				{
					provide: PrivacySettingsRepository,
					useValue: {
						findByUserId: jest.fn(),
						createDefault: jest.fn(),
						save: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<PrivacyService>(PrivacyService);
		userRepository = module.get(UserRepository);
		privacySettingsRepository = module.get(PrivacySettingsRepository);
	});

	describe('getSettings', () => {
		it('returns existing settings when found', async () => {
			const user = mockUser();
			const settings = mockSettings();
			userRepository.findById.mockResolvedValue(user);
			privacySettingsRepository.findByUserId.mockResolvedValue(settings);

			const result = await service.getSettings('uuid-1');

			expect(result).toBe(settings);
			expect(privacySettingsRepository.createDefault).not.toHaveBeenCalled();
		});

		it('creates and returns default settings when none exist', async () => {
			const user = mockUser();
			const settings = mockSettings();
			userRepository.findById.mockResolvedValue(user);
			privacySettingsRepository.findByUserId.mockResolvedValue(null);
			privacySettingsRepository.createDefault.mockResolvedValue(settings);

			const result = await service.getSettings('uuid-1');

			expect(privacySettingsRepository.createDefault).toHaveBeenCalledWith('uuid-1');
			expect(result).toBe(settings);
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.getSettings('uuid-1')).rejects.toThrow(NotFoundException);
		});
	});

	describe('updateSettings', () => {
		it('updates and returns the settings', async () => {
			const user = mockUser();
			const settings = mockSettings();
			const dto: UpdatePrivacySettingsDto = {
				lastSeenPrivacy: PrivacyLevel.NOBODY,
				readReceipts: false,
			};
			const saved = { ...settings, ...dto } as PrivacySettings;

			userRepository.findById.mockResolvedValue(user);
			privacySettingsRepository.findByUserId.mockResolvedValue(settings);
			privacySettingsRepository.save.mockResolvedValue(saved);

			const result = await service.updateSettings('uuid-1', dto);

			expect(privacySettingsRepository.save).toHaveBeenCalledWith(expect.objectContaining(dto));
			expect(result).toBe(saved);
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.updateSettings('uuid-1', {})).rejects.toThrow(NotFoundException);
		});

		it('creates default settings before updating when none exist', async () => {
			const user = mockUser();
			const defaultSettings = mockSettings();
			const dto: UpdatePrivacySettingsDto = { searchByPhone: false };
			const saved = { ...defaultSettings, ...dto } as PrivacySettings;

			userRepository.findById.mockResolvedValue(user);
			privacySettingsRepository.findByUserId.mockResolvedValue(null);
			privacySettingsRepository.createDefault.mockResolvedValue(defaultSettings);
			privacySettingsRepository.save.mockResolvedValue(saved);

			const result = await service.updateSettings('uuid-1', dto);

			expect(privacySettingsRepository.createDefault).toHaveBeenCalledWith('uuid-1');
			expect(result).toBe(saved);
		});
	});
});
