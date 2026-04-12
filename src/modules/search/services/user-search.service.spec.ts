import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserSearchService } from './user-search.service';
import { SearchIndexService, SearchIndexEntry } from '../../cache/search-index.service';
import { PrivacyService } from '../../privacy/services/privacy.service';
import { UserRepository } from '../../common/repositories';
import { User } from '../../common/entities/user.entity';
import {
	PrivacySettings,
	PrivacyLevel,
	MediaAutoDownload,
} from '../../privacy/entities/privacy-settings.entity';

const mockUser = (): User =>
	({
		id: 'uuid-1',
		phoneNumber: '+33600000001',
		username: 'testuser',
		firstName: 'Test',
		lastName: 'User',
		biography: null,
		profilePictureUrl: null,
		isActive: true,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01'),
	}) as User;

const mockPrivacySettings = (overrides: Partial<PrivacySettings> = {}): PrivacySettings =>
	({
		id: 'settings-1',
		userId: 'uuid-1',
		searchByPhone: true,
		searchByUsername: true,
		profilePicturePrivacy: PrivacyLevel.EVERYONE,
		firstNamePrivacy: PrivacyLevel.EVERYONE,
		lastNamePrivacy: PrivacyLevel.CONTACTS,
		biographyPrivacy: PrivacyLevel.EVERYONE,
		lastSeenPrivacy: PrivacyLevel.CONTACTS,
		readReceipts: true,
		onlineStatus: PrivacyLevel.CONTACTS,
		groupAddPermission: PrivacyLevel.CONTACTS,
		mediaAutoDownload: MediaAutoDownload.WIFI_ONLY,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}) as PrivacySettings;

const mockIndexEntry = (): SearchIndexEntry => ({
	userId: 'uuid-1',
	phoneNumber: '+33600000001',
	username: 'testuser',
	firstName: 'Test',
	lastName: 'User',
	fullName: 'test user',
	isActive: true,
	createdAt: new Date('2024-01-01'),
});

describe('UserSearchService', () => {
	let service: UserSearchService;
	let searchIndexService: jest.Mocked<SearchIndexService>;
	let privacyService: jest.Mocked<PrivacyService>;
	let userRepository: jest.Mocked<UserRepository>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UserSearchService,
				{
					provide: SearchIndexService,
					useValue: {
						searchByPhoneNumber: jest.fn(),
						searchByUsername: jest.fn(),
						searchByName: jest.fn(),
						getCachedUser: jest.fn(),
						indexUser: jest.fn(),
					},
				},
				{
					provide: PrivacyService,
					useValue: {
						getSettings: jest.fn(),
					},
				},
				{
					provide: UserRepository,
					useValue: {
						findById: jest.fn(),
						findByPhoneNumber: jest.fn(),
						findByPhoneNumberWithFilter: jest.fn(),
						findByUsernameInsensitive: jest.fn(),
						searchByDisplayName: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<UserSearchService>(UserSearchService);
		searchIndexService = module.get(SearchIndexService);
		privacyService = module.get(PrivacyService);
		userRepository = module.get(UserRepository);
	});

	describe('searchByPhone', () => {
		it('returns user when found in Redis index', async () => {
			const user = mockUser();
			searchIndexService.searchByPhoneNumber.mockResolvedValue('uuid-1');
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByPhone: true }));
			userRepository.findById.mockResolvedValue(user);

			const result = await service.searchByPhone('+33600000001');

			expect(result).toBe(user);
		});

		it('falls back to database when not in Redis', async () => {
			const user = mockUser();
			searchIndexService.searchByPhoneNumber.mockResolvedValue(null);
			userRepository.findByPhoneNumberWithFilter.mockResolvedValue(user);
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByPhone: true }));
			userRepository.findById.mockResolvedValue(user);
			searchIndexService.indexUser.mockResolvedValue(undefined);

			const result = await service.searchByPhone('+33600000001');

			expect(result).toBe(user);
			expect(userRepository.findByPhoneNumberWithFilter).toHaveBeenCalledWith('+33600000001');
		});

		it('returns null when user has disabled searchByPhone', async () => {
			searchIndexService.searchByPhoneNumber.mockResolvedValue('uuid-1');
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByPhone: false }));

			const result = await service.searchByPhone('+33600000001');

			expect(result).toBeNull();
		});

		it('returns null when not found in Redis or database', async () => {
			searchIndexService.searchByPhoneNumber.mockResolvedValue(null);
			userRepository.findByPhoneNumberWithFilter.mockResolvedValue(null);

			const result = await service.searchByPhone('+33600000001');

			expect(result).toBeNull();
		});
	});

	describe('searchByUsername', () => {
		it('returns user when found in Redis index', async () => {
			const user = mockUser();
			searchIndexService.searchByUsername.mockResolvedValue('uuid-1');
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByUsername: true }));
			userRepository.findById.mockResolvedValue(user);

			const result = await service.searchByUsername('testuser');

			expect(result).toBe(user);
		});

		it('falls back to database when not in Redis', async () => {
			const user = mockUser();
			searchIndexService.searchByUsername.mockResolvedValue(null);
			userRepository.findByUsernameInsensitive.mockResolvedValue(user);
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByUsername: true }));
			userRepository.findById.mockResolvedValue(user);
			searchIndexService.indexUser.mockResolvedValue(undefined);

			const result = await service.searchByUsername('testuser');

			expect(result).toBe(user);
			expect(userRepository.findByUsernameInsensitive).toHaveBeenCalledWith('testuser');
		});

		it('returns null when user has disabled searchByUsername', async () => {
			searchIndexService.searchByUsername.mockResolvedValue('uuid-1');
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByUsername: false }));

			const result = await service.searchByUsername('testuser');

			expect(result).toBeNull();
		});

		it('returns null when not found in Redis or database', async () => {
			searchIndexService.searchByUsername.mockResolvedValue(null);
			userRepository.findByUsernameInsensitive.mockResolvedValue(null);

			const result = await service.searchByUsername('testuser');

			expect(result).toBeNull();
		});
	});

	describe('searchByDisplayName', () => {
		it('returns list of results from the index', async () => {
			const entry = mockIndexEntry();
			searchIndexService.searchByName.mockResolvedValue(['uuid-1']);
			searchIndexService.getCachedUser.mockResolvedValue(entry);

			const result = await service.searchByDisplayName('Test');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				userId: 'uuid-1',
				username: 'testuser',
				firstName: 'Test',
				lastName: 'User',
			});
		});

		it('falls back to database when Redis returns empty', async () => {
			const user = mockUser();
			searchIndexService.searchByName.mockResolvedValue([]);
			searchIndexService.getCachedUser.mockResolvedValue(null);
			userRepository.searchByDisplayName.mockResolvedValue([user]);
			searchIndexService.indexUser.mockResolvedValue(undefined);

			const result = await service.searchByDisplayName('Test');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				userId: 'uuid-1',
				username: 'testuser',
				firstName: 'Test',
				lastName: 'User',
			});
			expect(userRepository.searchByDisplayName).toHaveBeenCalledWith('Test', 20);
		});

		it('skips users not found in cache', async () => {
			searchIndexService.searchByName.mockResolvedValue(['uuid-1', 'uuid-2']);
			searchIndexService.getCachedUser
				.mockResolvedValueOnce(mockIndexEntry())
				.mockResolvedValueOnce(null);

			const result = await service.searchByDisplayName('Test');

			expect(result).toHaveLength(1);
		});

		it('returns empty array when no users match anywhere', async () => {
			searchIndexService.searchByName.mockResolvedValue([]);
			searchIndexService.getCachedUser.mockResolvedValue(null);
			userRepository.searchByDisplayName.mockResolvedValue([]);

			const result = await service.searchByDisplayName('NoMatch');

			expect(result).toEqual([]);
		});
	});

	describe('searchByPhoneBatch', () => {
		it('returns empty array for empty input', async () => {
			const result = await service.searchByPhoneBatch([]);

			expect(result).toEqual([]);
			expect(searchIndexService.searchByPhoneNumber).not.toHaveBeenCalled();
		});

		it('returns matched users for multiple phone numbers', async () => {
			const userA = { ...mockUser(), id: 'uuid-a', phoneNumber: '+33600000001' } as User;
			const userB = { ...mockUser(), id: 'uuid-b', phoneNumber: '+33600000002' } as User;

			searchIndexService.searchByPhoneNumber.mockImplementation(async (n) =>
				n === '+33600000001' ? 'uuid-a' : n === '+33600000002' ? 'uuid-b' : null
			);
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByPhone: true }));
			userRepository.findById.mockImplementation(async (id) =>
				id === 'uuid-a' ? userA : id === 'uuid-b' ? userB : null
			);

			const result = await service.searchByPhoneBatch(['+33600000001', '+33600000002']);

			expect(result).toHaveLength(2);
			expect(result).toEqual(expect.arrayContaining([userA, userB]));
		});

		it('filters out numbers with no match', async () => {
			const userA = { ...mockUser(), id: 'uuid-a' } as User;
			searchIndexService.searchByPhoneNumber.mockImplementation(async (n) =>
				n === '+33600000001' ? 'uuid-a' : null
			);
			userRepository.findByPhoneNumberWithFilter.mockResolvedValue(null);
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByPhone: true }));
			userRepository.findById.mockResolvedValue(userA);

			const result = await service.searchByPhoneBatch(['+33600000001', '+33699999999']);

			expect(result).toEqual([userA]);
		});

		it('filters out users with searchByPhone disabled', async () => {
			const userA = { ...mockUser(), id: 'uuid-a' } as User;
			const userB = { ...mockUser(), id: 'uuid-b' } as User;

			searchIndexService.searchByPhoneNumber.mockImplementation(async (n) =>
				n === '+33600000001' ? 'uuid-a' : 'uuid-b'
			);
			privacyService.getSettings.mockImplementation(async (id) =>
				mockPrivacySettings({ searchByPhone: id === 'uuid-a' })
			);
			userRepository.findById.mockImplementation(async (id) => (id === 'uuid-a' ? userA : userB));

			const result = await service.searchByPhoneBatch(['+33600000001', '+33600000002']);

			expect(result).toEqual([userA]);
		});

		it('tolerates individual failures without aborting the batch', async () => {
			const userB = { ...mockUser(), id: 'uuid-b' } as User;

			searchIndexService.searchByPhoneNumber.mockImplementation(async (n) => {
				if (n === '+33600000001') throw new Error('Redis error');
				return 'uuid-b';
			});
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByPhone: true }));
			userRepository.findById.mockResolvedValue(userB);
			userRepository.findByPhoneNumberWithFilter.mockResolvedValue(null);

			const result = await service.searchByPhoneBatch(['+33600000001', '+33600000002']);

			expect(result).toEqual([userB]);
		});

		it('processes more than 50 numbers via chunking', async () => {
			const phoneNumbers = Array.from(
				{ length: 120 },
				(_, i) => `+3360000${String(i).padStart(4, '0')}`
			);
			searchIndexService.searchByPhoneNumber.mockResolvedValue(null);
			userRepository.findByPhoneNumberWithFilter.mockResolvedValue(null);

			const result = await service.searchByPhoneBatch(phoneNumbers);

			expect(result).toEqual([]);
			expect(searchIndexService.searchByPhoneNumber).toHaveBeenCalledTimes(120);
		});
	});

	describe('indexUser', () => {
		it('indexes the user when found', async () => {
			const user = mockUser();
			userRepository.findById.mockResolvedValue(user);
			searchIndexService.indexUser.mockResolvedValue(undefined);

			await service.indexUser('uuid-1');

			expect(searchIndexService.indexUser).toHaveBeenCalledWith(user);
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.indexUser('uuid-missing')).rejects.toThrow(NotFoundException);
			expect(searchIndexService.indexUser).not.toHaveBeenCalled();
		});
	});
});
