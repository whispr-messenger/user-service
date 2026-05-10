import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InternalPrivacyService } from './internal-privacy.service';
import { UserRepository } from '../../common/repositories';
import { PrivacySettingsRepository } from '../../privacy/repositories/privacy-settings.repository';
import { PrivacyLevel, PrivacySettings } from '../../privacy/entities/privacy-settings.entity';

describe('InternalPrivacyService', () => {
	let service: InternalPrivacyService;
	let userRepository: jest.Mocked<UserRepository>;
	let privacySettingsRepository: jest.Mocked<PrivacySettingsRepository>;

	const USER_ID = 'a0000000-0000-4000-a000-000000000001';

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				InternalPrivacyService,
				{
					provide: UserRepository,
					useValue: { findById: jest.fn() },
				},
				{
					provide: PrivacySettingsRepository,
					useValue: { findByUserId: jest.fn() },
				},
			],
		}).compile();

		service = module.get(InternalPrivacyService);
		userRepository = module.get(UserRepository);
		privacySettingsRepository = module.get(PrivacySettingsRepository);
	});

	describe('getPrivacyForInternal', () => {
		it('throws NotFoundException when the user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.getPrivacyForInternal(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
			expect(privacySettingsRepository.findByUserId).not.toHaveBeenCalled();
		});

		it('returns defaults without persisting when settings row is missing', async () => {
			userRepository.findById.mockResolvedValue({ id: USER_ID } as never);
			privacySettingsRepository.findByUserId.mockResolvedValue(null);

			const result = await service.getPrivacyForInternal(USER_ID);

			expect(result).toEqual({
				userId: USER_ID,
				readReceipts: true,
				lastSeenPrivacy: PrivacyLevel.CONTACTS,
				onlineStatus: PrivacyLevel.CONTACTS,
			});
		});

		it('returns the stored privacy settings projected to the internal DTO shape', async () => {
			userRepository.findById.mockResolvedValue({ id: USER_ID } as never);
			const settings = {
				userId: USER_ID,
				readReceipts: false,
				lastSeenPrivacy: PrivacyLevel.NOBODY,
				onlineStatus: PrivacyLevel.EVERYONE,
			} as PrivacySettings;
			privacySettingsRepository.findByUserId.mockResolvedValue(settings);

			const result = await service.getPrivacyForInternal(USER_ID);

			expect(result).toEqual({
				userId: USER_ID,
				readReceipts: false,
				lastSeenPrivacy: PrivacyLevel.NOBODY,
				onlineStatus: PrivacyLevel.EVERYONE,
			});
		});
	});
});
