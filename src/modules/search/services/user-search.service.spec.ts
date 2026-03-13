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
		it('returns user when found and searchByPhone is enabled', async () => {
			const user = mockUser();
			searchIndexService.searchByPhoneNumber.mockResolvedValue('uuid-1');
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByPhone: true }));
			userRepository.findById.mockResolvedValue(user);

			const result = await service.searchByPhone('+33600000001');

			expect(result).toBe(user);
		});

		it('returns null when user has disabled searchByPhone', async () => {
			searchIndexService.searchByPhoneNumber.mockResolvedValue('uuid-1');
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByPhone: false }));

			const result = await service.searchByPhone('+33600000001');

			expect(result).toBeNull();
			expect(userRepository.findById).not.toHaveBeenCalled();
		});

		it('returns null when phone number is not indexed', async () => {
			searchIndexService.searchByPhoneNumber.mockResolvedValue(null);

			const result = await service.searchByPhone('+33600000001');

			expect(result).toBeNull();
			expect(privacyService.getSettings).not.toHaveBeenCalled();
		});
	});

	describe('searchByUsername', () => {
		it('returns user when found and searchByUsername is enabled', async () => {
			const user = mockUser();
			searchIndexService.searchByUsername.mockResolvedValue('uuid-1');
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByUsername: true }));
			userRepository.findById.mockResolvedValue(user);

			const result = await service.searchByUsername('testuser');

			expect(result).toBe(user);
		});

		it('returns null when user has disabled searchByUsername', async () => {
			searchIndexService.searchByUsername.mockResolvedValue('uuid-1');
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings({ searchByUsername: false }));

			const result = await service.searchByUsername('testuser');

			expect(result).toBeNull();
			expect(userRepository.findById).not.toHaveBeenCalled();
		});

		it('returns null when username is not indexed', async () => {
			searchIndexService.searchByUsername.mockResolvedValue(null);

			const result = await service.searchByUsername('testuser');

			expect(result).toBeNull();
			expect(privacyService.getSettings).not.toHaveBeenCalled();
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

		it('skips users not found in cache', async () => {
			searchIndexService.searchByName.mockResolvedValue(['uuid-1', 'uuid-2']);
			searchIndexService.getCachedUser
				.mockResolvedValueOnce(mockIndexEntry())
				.mockResolvedValueOnce(null);

			const result = await service.searchByDisplayName('Test');

			expect(result).toHaveLength(1);
		});

		it('returns empty array when no users match', async () => {
			searchIndexService.searchByName.mockResolvedValue([]);

			const result = await service.searchByDisplayName('NoMatch');

			expect(result).toEqual([]);
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
