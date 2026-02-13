/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PrivacyService } from './privacy.service';
import { PrivacySettings, User, PrivacyLevel, Contact, BlockedUser } from '../entities';
import { UpdatePrivacySettingsDto } from '../dto';
import { CacheService } from '../cache/cache.service';

describe('PrivacyService', () => {
	let service: PrivacyService;
	let privacyRepository: Repository<PrivacySettings>;
	let userRepository: Repository<User>;

	const mockUser: Partial<User> = {
		id: '123e4567-e89b-12d3-a456-426614174000',
		username: 'testuser',
		phoneNumber: '+1234567890',
		firstName: 'Test',
		lastName: 'User',
		isActive: true,
	};

	let mockPrivacySettings: Partial<PrivacySettings>;

	const mockPrivacyRepository = {
		findOne: jest.fn(),
		save: jest.fn(),
		create: jest.fn(),
	};

	const mockUserRepository = {
		findOne: jest.fn(),
	};

	const mockContactRepository = {
		findOne: jest.fn(),
	};

	const mockBlockedUserRepository = {
		findOne: jest.fn(),
	};

	const mockCacheService = {
		get: jest.fn(),
		set: jest.fn(),
		del: jest.fn(),
		keys: jest.fn(() => []),
		delMany: jest.fn(),
	};

	beforeEach(async () => {
		mockPrivacySettings = {
			id: '123e4567-e89b-12d3-a456-426614174001',
			userId: mockUser.id,
			profilePicturePrivacy: PrivacyLevel.EVERYONE,
			firstNamePrivacy: PrivacyLevel.EVERYONE,
			lastNamePrivacy: PrivacyLevel.CONTACTS,
			biographyPrivacy: PrivacyLevel.EVERYONE,
			lastSeenPrivacy: PrivacyLevel.EVERYONE,
			searchByPhone: true,
			searchByUsername: true,
			readReceipts: true,
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PrivacyService,
				{
					provide: getRepositoryToken(PrivacySettings),
					useValue: mockPrivacyRepository,
				},
				{
					provide: getRepositoryToken(User),
					useValue: mockUserRepository,
				},
				{
					provide: getRepositoryToken(Contact),
					useValue: mockContactRepository,
				},
				{
					provide: getRepositoryToken(BlockedUser),
					useValue: mockBlockedUserRepository,
				},
				{
					provide: CacheService,
					useValue: mockCacheService,
				},
			],
		}).compile();

		service = module.get<PrivacyService>(PrivacyService);
		privacyRepository = module.get<Repository<PrivacySettings>>(getRepositoryToken(PrivacySettings));
		userRepository = module.get<Repository<User>>(getRepositoryToken(User));
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('getPrivacySettings', () => {
		it('should return cached privacy settings if available', async () => {
			mockCacheService.get.mockResolvedValue(mockPrivacySettings);

			const result = await service.getPrivacySettings(mockUser.id);

			expect(result).toEqual(mockPrivacySettings);
			expect(mockCacheService.get).toHaveBeenCalledWith(`privacy:${mockUser.id}`);
			expect(mockPrivacyRepository.findOne).not.toHaveBeenCalled();
		});

		it('should return privacy settings for a user from db if not in cache', async () => {
			mockCacheService.get.mockResolvedValue(null);
			mockPrivacyRepository.findOne.mockResolvedValue(mockPrivacySettings);

			const result = await service.getPrivacySettings(mockUser.id);

			expect(result).toEqual(mockPrivacySettings);
			expect(mockPrivacyRepository.findOne).toHaveBeenCalledWith({
				where: { userId: mockUser.id },
				relations: ['user'],
			});
			expect(mockCacheService.set).toHaveBeenCalledWith(
				`privacy:${mockUser.id}`,
				mockPrivacySettings,
				3600
			);
		});

		it('should throw NotFoundException if privacy settings not found', async () => {
			mockCacheService.get.mockResolvedValue(null);
			mockPrivacyRepository.findOne.mockResolvedValue(null);

			await expect(service.getPrivacySettings('nonexistent')).rejects.toThrow(NotFoundException);
		});
	});

	describe('updatePrivacySettings', () => {
		const updateDto: UpdatePrivacySettingsDto = {
			profilePicturePrivacy: PrivacyLevel.CONTACTS,
			firstNamePrivacy: PrivacyLevel.CONTACTS,
		};

		it('should update privacy settings successfully', async () => {
			const updatedSettings = { ...mockPrivacySettings, ...updateDto };
			mockCacheService.get.mockResolvedValue(mockPrivacySettings);
			mockPrivacyRepository.findOne.mockResolvedValue(mockPrivacySettings);
			mockPrivacyRepository.save.mockResolvedValue(updatedSettings);

			const result = await service.updatePrivacySettings(mockUser.id, updateDto);

			expect(result).toEqual(updatedSettings);
			expect(mockPrivacyRepository.save).toHaveBeenCalledWith({
				...mockPrivacySettings,
				...updateDto,
			});
			expect(mockCacheService.del).toHaveBeenCalledWith(`privacy:${mockUser.id}`);
		});

		it('should throw NotFoundException if privacy settings not found', async () => {
			mockCacheService.get.mockResolvedValue(null);
			mockPrivacyRepository.findOne.mockResolvedValue(null);

			await expect(service.updatePrivacySettings('nonexistent', updateDto)).rejects.toThrow(
				NotFoundException
			);
		});
	});

	describe('filterUserData', () => {
		const viewerUser: Partial<User> = {
			id: 'viewer-id',
			username: 'viewer',
		};

		it('should return full user data if viewer is the user themselves', async () => {
			const result = await service.filterUserData(mockUser.id, mockUser as User);
			expect(result).toEqual(mockUser);
		});

		it('should return minimal info if blocked', async () => {
			mockBlockedUserRepository.findOne.mockResolvedValue({ id: 'block-id' });

			const result = await service.filterUserData(viewerUser.id, mockUser as User);

			expect(result).toEqual({ id: mockUser.id });
			expect(mockBlockedUserRepository.findOne).toHaveBeenCalled();
		});

		it('should return filtered user data based on privacy settings (public)', async () => {
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockCacheService.get.mockResolvedValue(mockPrivacySettings);
			mockContactRepository.findOne.mockResolvedValue(null); // Not contacts

			const result = await service.filterUserData(viewerUser.id, mockUser as User);

			// mockPrivacySettings has firstName/lastSeen/etc as EVERYONE
			expect(result.firstName).toBe(mockUser.firstName);
			expect(result.username).toBe(mockUser.username);

			// lastName is CONTACTS in mockPrivacySettings, so should be undefined since not contacts
			expect(result.lastName).toBeUndefined();
		});

		it('should return data if privacy level is CONTACTS and users are contacts', async () => {
			const contactSettings = {
				...mockPrivacySettings,
				firstNamePrivacy: PrivacyLevel.CONTACTS,
			};
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockCacheService.get.mockResolvedValue(contactSettings);
			mockContactRepository.findOne.mockResolvedValue({ id: 'contact-id' }); // Are contacts

			const result = await service.filterUserData(viewerUser.id, mockUser as User);

			expect(result.firstName).toBe(mockUser.firstName);
		});

		it('should not return data if privacy level is CONTACTS and users are NOT contacts', async () => {
			const contactSettings = {
				...mockPrivacySettings,
				firstNamePrivacy: PrivacyLevel.CONTACTS,
			};
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockCacheService.get.mockResolvedValue(contactSettings);
			mockContactRepository.findOne.mockResolvedValue(null); // Not contacts

			const result = await service.filterUserData(viewerUser.id, mockUser as User);

			expect(result.firstName).toBeUndefined();
		});

		it('should respect privacy settings for NOBODY', async () => {
			const restrictiveSettings = {
				...mockPrivacySettings,
				firstNamePrivacy: PrivacyLevel.NOBODY,
				lastNamePrivacy: PrivacyLevel.NOBODY,
				biographyPrivacy: PrivacyLevel.NOBODY,
			};
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockCacheService.get.mockResolvedValue(restrictiveSettings);

			const result = await service.filterUserData(viewerUser.id, mockUser as User);

			expect(result.firstName).toBeUndefined();
			expect(result.lastName).toBeUndefined();
			expect(result.biography).toBeUndefined();
			expect(result.username).toBe(mockUser.username); // Always visible
		});
	});

	describe('checkAccess helpers', () => {
		const viewerId = 'viewer-id';
		const targetId = 'target-id';

		it('should return true if viewer is target', async () => {
			const result = await service.canViewFirstName(targetId, targetId);
			expect(result).toBe(true);
		});

		it('should return false if blocked', async () => {
			mockBlockedUserRepository.findOne.mockResolvedValue({ id: 'block-id' });
			const result = await service.canViewFirstName(viewerId, targetId);
			expect(result).toBe(false);
		});

		it('should return true if EVERYONE', async () => {
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockCacheService.get.mockResolvedValue({ firstNamePrivacy: PrivacyLevel.EVERYONE });

			const result = await service.canViewFirstName(viewerId, targetId);
			expect(result).toBe(true);
		});

		it('should return true if CONTACTS and is contact', async () => {
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockCacheService.get.mockResolvedValue({ firstNamePrivacy: PrivacyLevel.CONTACTS });
			mockContactRepository.findOne.mockResolvedValue({ id: 'contact-id' });

			const result = await service.canViewFirstName(viewerId, targetId);
			expect(result).toBe(true);
		});

		it('should return false if CONTACTS and is NOT contact', async () => {
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockCacheService.get.mockResolvedValue({ firstNamePrivacy: PrivacyLevel.CONTACTS });
			mockContactRepository.findOne.mockResolvedValue(null);

			const result = await service.canViewFirstName(viewerId, targetId);
			expect(result).toBe(false);
		});

		it('should return false if NOBODY', async () => {
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockCacheService.get.mockResolvedValue({ firstNamePrivacy: PrivacyLevel.NOBODY });

			const result = await service.canViewFirstName(viewerId, targetId);
			expect(result).toBe(false);
		});
	});

	describe('other getters', () => {
		it('should return searchByPhone setting', async () => {
			mockCacheService.get.mockResolvedValue({ searchByPhone: true });
			const result = await service.canSearchByPhone(mockUser.id);
			expect(result).toBe(true);
		});

		it('should return searchByUsername setting', async () => {
			mockCacheService.get.mockResolvedValue({ searchByUsername: false });
			const result = await service.canSearchByUsername(mockUser.id);
			expect(result).toBe(false);
		});

		it('should return readReceipts setting', async () => {
			mockCacheService.get.mockResolvedValue({ readReceipts: true });
			const result = await service.shouldSendReadReceipts(mockUser.id);
			expect(result).toBe(true);
		});

		it('should check canViewProfilePicture', async () => {
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockCacheService.get.mockResolvedValue({ profilePicturePrivacy: PrivacyLevel.EVERYONE });
			const result = await service.canViewProfilePicture('viewer', 'target');
			expect(result).toBe(true);
		});

		it('should check canViewLastName', async () => {
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockCacheService.get.mockResolvedValue({ lastNamePrivacy: PrivacyLevel.EVERYONE });
			const result = await service.canViewLastName('viewer', 'target');
			expect(result).toBe(true);
		});

		it('should check canViewBiography', async () => {
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockCacheService.get.mockResolvedValue({ biographyPrivacy: PrivacyLevel.EVERYONE });
			const result = await service.canViewBiography('viewer', 'target');
			expect(result).toBe(true);
		});

		it('should check canViewLastSeen', async () => {
			mockBlockedUserRepository.findOne.mockResolvedValue(null);
			mockCacheService.get.mockResolvedValue({ lastSeenPrivacy: PrivacyLevel.EVERYONE });
			const result = await service.canViewLastSeen('viewer', 'target');
			expect(result).toBe(true);
		});
	});
});
