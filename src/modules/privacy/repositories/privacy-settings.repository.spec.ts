import { PrivacySettingsRepository } from './privacy-settings.repository';
import { PrivacySettings, PrivacyLevel, MediaAutoDownload } from '../entities/privacy-settings.entity';

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	findOne: jest.fn(),
};

describe('PrivacySettingsRepository', () => {
	let repo: PrivacySettingsRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repo = new PrivacySettingsRepository(mockTypeormRepo as any);
	});

	describe('findByUserId', () => {
		it('returns the settings when found', async () => {
			const settings = { userId: 'user-1' } as PrivacySettings;
			mockTypeormRepo.findOne.mockResolvedValue(settings);

			const result = await repo.findByUserId('user-1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
			expect(result).toBe(settings);
		});

		it('returns null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findByUserId('missing');

			expect(result).toBeNull();
		});
	});

	describe('createDefault', () => {
		it('creates settings with the documented defaults', async () => {
			const draft = { userId: 'user-1' } as PrivacySettings;
			const saved = { id: 'ps-1', ...draft } as PrivacySettings;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.createDefault('user-1');

			expect(mockTypeormRepo.create).toHaveBeenCalledWith({
				userId: 'user-1',
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
			});
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(result).toBe(saved);
		});
	});

	describe('save', () => {
		it('delegates to the typeorm save', async () => {
			const settings = { userId: 'user-1' } as PrivacySettings;
			mockTypeormRepo.save.mockResolvedValue(settings);

			const result = await repo.save(settings);

			expect(mockTypeormRepo.save).toHaveBeenCalledWith(settings);
			expect(result).toBe(settings);
		});
	});
});
