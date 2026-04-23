import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UserRepository } from '../../common/repositories';
import { MediaClientService, MediaMetadata } from './media-client.service';
import { SearchIndexService } from '../../cache/search-index.service';
import { PrivacyService } from '../../privacy/services/privacy.service';
import { ContactsService } from '../../contacts/services/contacts.service';
import { PrivacySettings, PrivacyLevel } from '../../privacy/entities/privacy-settings.entity';
import { User } from '../../common/entities/user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';

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

const mockMediaMetadata = (overrides: Partial<MediaMetadata> = {}): MediaMetadata => ({
	id: 'media-uuid-1',
	ownerId: 'uuid-1',
	context: 'avatar',
	contentType: 'image/webp',
	blobSize: 12345,
	hasThumbnail: false,
	isActive: true,
	createdAt: '2026-04-01T00:00:00Z',
	expiresAt: null,
	...overrides,
});

const mockPrivacySettings = (overrides: Partial<PrivacySettings> = {}): PrivacySettings =>
	({
		id: 'ps-uuid-1',
		userId: 'uuid-1',
		profilePicturePrivacy: PrivacyLevel.EVERYONE,
		firstNamePrivacy: PrivacyLevel.EVERYONE,
		lastNamePrivacy: PrivacyLevel.EVERYONE,
		biographyPrivacy: PrivacyLevel.EVERYONE,
		lastSeenPrivacy: PrivacyLevel.EVERYONE,
		onlineStatus: PrivacyLevel.EVERYONE,
		groupAddPermission: PrivacyLevel.EVERYONE,
		...overrides,
	}) as PrivacySettings;

describe('ProfileService', () => {
	let service: ProfileService;
	let userRepository: jest.Mocked<UserRepository>;
	let mediaClient: jest.Mocked<MediaClientService>;
	let searchIndexService: { indexUser: jest.Mock; removeUserFromIndex: jest.Mock };
	let privacyService: { getSettings: jest.Mock };
	let contactsService: { isContact: jest.Mock };

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ProfileService,
				{
					provide: UserRepository,
					useValue: {
						findById: jest.fn(),
						findByUsernameInsensitive: jest.fn(),
						save: jest.fn(),
					},
				},
				{
					provide: MediaClientService,
					useValue: {
						getMediaMetadata: jest.fn(),
						getBaseUrl: jest.fn().mockReturnValue('http://media-service:3000'),
						resolveProfilePictureUrl: jest
							.fn()
							.mockImplementation(
								(id: string) => `http://media-service:3000/media/v1/${id}/blob`
							),
					},
				},
				{
					provide: SearchIndexService,
					useValue: {
						indexUser: jest.fn().mockResolvedValue(undefined),
						removeUserFromIndex: jest.fn().mockResolvedValue(undefined),
					},
				},
				{
					provide: PrivacyService,
					useValue: {
						getSettings: jest.fn(),
					},
				},
				{
					provide: ContactsService,
					useValue: {
						isContact: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<ProfileService>(ProfileService);
		userRepository = module.get(UserRepository);
		mediaClient = module.get(MediaClientService);
		searchIndexService = module.get(SearchIndexService);
		privacyService = module.get(PrivacyService);
		contactsService = module.get(ContactsService);
	});

	describe('getProfile', () => {
		it('returns the user when found', async () => {
			const user = mockUser();
			userRepository.findById.mockResolvedValue(user);

			const result = await service.getProfile('uuid-1');

			expect(result).toBe(user);
			expect(userRepository.findById).toHaveBeenCalledWith('uuid-1');
		});

		it('resolves profilePictureUrl to blob URL when set', async () => {
			const user = { ...mockUser(), profilePictureUrl: 'media-uuid-1' } as User;
			userRepository.findById.mockResolvedValue(user);

			const result = await service.getProfile('uuid-1');

			expect(result.profilePictureUrl).toBe('http://media-service:3000/media/v1/media-uuid-1/blob');
		});

		it('returns null profilePictureUrl when not set', async () => {
			const user = mockUser();
			userRepository.findById.mockResolvedValue(user);

			const result = await service.getProfile('uuid-1');

			expect(result.profilePictureUrl).toBeNull();
			expect(mediaClient.resolveProfilePictureUrl).not.toHaveBeenCalled();
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.getProfile('uuid-1')).rejects.toThrow(NotFoundException);
		});
	});

	describe('updateProfile', () => {
		it('updates and returns the user', async () => {
			const user = mockUser();
			const dto: UpdateProfileDto = { firstName: 'Alice', lastName: 'Smith' };
			const saved = { ...user, ...dto } as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.save.mockResolvedValue(saved);

			const result = await service.updateProfile('uuid-1', dto);

			expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining(dto));
			expect(result).toBe(saved);
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.updateProfile('uuid-1', {})).rejects.toThrow(NotFoundException);
		});

		it('throws ConflictException when username is already taken by another user', async () => {
			const user = mockUser();
			const dto: UpdateProfileDto = { username: 'taken' };
			const otherUser = { ...mockUser(), id: 'uuid-2', username: 'taken' } as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.findByUsernameInsensitive.mockResolvedValue(otherUser);

			await expect(service.updateProfile('uuid-1', dto)).rejects.toThrow(ConflictException);
		});

		it('does not check username uniqueness when username is unchanged', async () => {
			const user = { ...mockUser(), username: 'alice' } as User;
			const dto: UpdateProfileDto = { username: 'alice', firstName: 'Alice' };
			const saved = { ...user, ...dto } as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.save.mockResolvedValue(saved);

			await service.updateProfile('uuid-1', dto);

			expect(userRepository.findByUsernameInsensitive).not.toHaveBeenCalled();
		});

		it('indexes user in search when username is updated', async () => {
			const user = mockUser();
			const dto: UpdateProfileDto = { username: 'alice' };
			const saved = { ...user, username: 'alice' } as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.findByUsernameInsensitive.mockResolvedValue(null);
			userRepository.save.mockResolvedValue(saved);

			await service.updateProfile('uuid-1', dto);

			expect(searchIndexService.indexUser).toHaveBeenCalledWith(saved);
		});

		it('removes old index entries when username changes', async () => {
			const user = { ...mockUser(), username: 'old-name' } as User;
			const dto: UpdateProfileDto = { username: 'new-name' };
			const saved = { ...user, username: 'new-name' } as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.findByUsernameInsensitive.mockResolvedValue(null);
			userRepository.save.mockResolvedValue(saved);

			await service.updateProfile('uuid-1', dto);

			expect(searchIndexService.removeUserFromIndex).toHaveBeenCalledWith(
				expect.objectContaining({ username: 'old-name' })
			);
		});

		it('swallows search indexing errors without failing the update', async () => {
			const user = mockUser();
			const dto: UpdateProfileDto = { firstName: 'Alice' };
			const saved = { ...user, firstName: 'Alice' } as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.save.mockResolvedValue(saved);
			searchIndexService.indexUser.mockRejectedValue(new Error('Redis down'));

			const result = await service.updateProfile('uuid-1', dto);

			expect(result).toBe(saved);
		});

		it('does not check username uniqueness when dto has no username', async () => {
			const user = mockUser();
			const dto: UpdateProfileDto = { biography: 'Hello world' };
			const saved = { ...user, ...dto } as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.save.mockResolvedValue(saved);

			await service.updateProfile('uuid-1', dto);

			expect(userRepository.findByUsernameInsensitive).not.toHaveBeenCalled();
		});
	});

	describe('updateProfile with avatarMediaId', () => {
		it('stores the raw mediaId and returns a resolved blob URL', async () => {
			const user = mockUser();
			const metadata = mockMediaMetadata();
			const dto: UpdateProfileDto = { avatarMediaId: 'media-uuid-1' };

			userRepository.findById.mockResolvedValue(user);
			mediaClient.getMediaMetadata.mockResolvedValue(metadata);
			let savedProfilePictureUrl: string | null = null;
			userRepository.save.mockImplementation(async (u) => {
				savedProfilePictureUrl = (u as User).profilePictureUrl;
				return u as User;
			});

			const result = await service.updateProfile('uuid-1', dto);

			expect(mediaClient.getMediaMetadata).toHaveBeenCalledWith('media-uuid-1', 'uuid-1', undefined);
			// DB receives the raw mediaId
			expect(savedProfilePictureUrl).toBe('media-uuid-1');
			// Returned value is the resolved URL
			expect(result.profilePictureUrl).toBe('http://media-service:3000/media/v1/media-uuid-1/blob');
		});

		it('throws BadRequestException when media context is not avatar', async () => {
			const user = mockUser();
			const metadata = mockMediaMetadata({ context: 'message' });
			const dto: UpdateProfileDto = { avatarMediaId: 'media-uuid-1' };

			userRepository.findById.mockResolvedValue(user);
			mediaClient.getMediaMetadata.mockResolvedValue(metadata);

			await expect(service.updateProfile('uuid-1', dto)).rejects.toThrow(BadRequestException);
		});

		it('throws BadRequestException when media does not belong to the user', async () => {
			const user = mockUser();
			const metadata = mockMediaMetadata({ ownerId: 'other-uuid' });
			const dto: UpdateProfileDto = { avatarMediaId: 'media-uuid-1' };

			userRepository.findById.mockResolvedValue(user);
			mediaClient.getMediaMetadata.mockResolvedValue(metadata);

			await expect(service.updateProfile('uuid-1', dto)).rejects.toThrow(BadRequestException);
		});

		it('does not store avatarMediaId as a database column', async () => {
			const user = mockUser();
			const metadata = mockMediaMetadata();
			const dto: UpdateProfileDto = { avatarMediaId: 'media-uuid-1', firstName: 'Alice' };

			userRepository.findById.mockResolvedValue(user);
			mediaClient.getMediaMetadata.mockResolvedValue(metadata);
			let savedSnapshot: Record<string, unknown> = {};
			userRepository.save.mockImplementation(async (u) => {
				savedSnapshot = { ...(u as any) };
				return u as User;
			});

			await service.updateProfile('uuid-1', dto);

			expect(savedSnapshot.avatarMediaId).toBeUndefined();
			expect(savedSnapshot.firstName).toBe('Alice');
			expect(savedSnapshot.profilePictureUrl).toBe('media-uuid-1');
		});
	});

	describe('getProfileWithPrivacy', () => {
		it('returns full profile when requester is the owner', async () => {
			const user = { ...mockUser(), firstName: 'Alice', lastName: 'Smith' } as User;
			userRepository.findById.mockResolvedValue(user);

			const result = await service.getProfileWithPrivacy('uuid-1', 'uuid-1');

			expect(result.firstName).toBe('Alice');
			expect(result.lastName).toBe('Smith');
			expect(privacyService.getSettings).not.toHaveBeenCalled();
		});

		it('resolves profilePictureUrl for owner', async () => {
			const user = { ...mockUser(), profilePictureUrl: 'media-uuid-1' } as User;
			userRepository.findById.mockResolvedValue(user);

			const result = await service.getProfileWithPrivacy('uuid-1', 'uuid-1');

			expect(result.profilePictureUrl).toBe('http://media-service:3000/media/v1/media-uuid-1/blob');
		});

		it('returns null profilePictureUrl when user has no avatar', async () => {
			const user = mockUser();
			userRepository.findById.mockResolvedValue(user);
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings());
			contactsService.isContact.mockResolvedValue(false);

			const result = await service.getProfileWithPrivacy('uuid-1', 'uuid-2');

			expect(result.profilePictureUrl).toBeNull();
			expect(mediaClient.resolveProfilePictureUrl).not.toHaveBeenCalled();
		});

		it('returns full profile when all fields are set to EVERYONE', async () => {
			const user = {
				...mockUser(),
				firstName: 'Alice',
				lastName: 'Smith',
				biography: 'Hello',
				profilePictureUrl: 'media-uuid-1',
				lastSeen: new Date(),
			} as User;
			userRepository.findById.mockResolvedValue(user);
			privacyService.getSettings.mockResolvedValue(mockPrivacySettings());
			contactsService.isContact.mockResolvedValue(false);

			const result = await service.getProfileWithPrivacy('uuid-1', 'uuid-2');

			expect(result.firstName).toBe('Alice');
			expect(result.lastName).toBe('Smith');
			expect(result.biography).toBe('Hello');
			expect(result.profilePictureUrl).toBe('http://media-service:3000/media/v1/media-uuid-1/blob');
		});

		it('masks fields set to NOBODY when requester is not the owner', async () => {
			const user = {
				...mockUser(),
				firstName: 'Alice',
				lastName: 'Smith',
				biography: 'Hello',
				profilePictureUrl: 'media-uuid-1',
				lastSeen: new Date(),
			} as User;
			userRepository.findById.mockResolvedValue(user);
			privacyService.getSettings.mockResolvedValue(
				mockPrivacySettings({
					firstNamePrivacy: PrivacyLevel.NOBODY,
					lastNamePrivacy: PrivacyLevel.NOBODY,
					biographyPrivacy: PrivacyLevel.NOBODY,
					profilePicturePrivacy: PrivacyLevel.NOBODY,
					lastSeenPrivacy: PrivacyLevel.NOBODY,
				})
			);
			contactsService.isContact.mockResolvedValue(false);

			const result = await service.getProfileWithPrivacy('uuid-1', 'uuid-2');

			expect(result.firstName).toBeNull();
			expect(result.lastName).toBeNull();
			expect(result.biography).toBeNull();
			expect(result.profilePictureUrl).toBeNull();
			expect(result.lastSeen).toBeNull();
		});

		it('reveals CONTACTS fields when requester is a contact', async () => {
			const lastSeen = new Date();
			const user = {
				...mockUser(),
				firstName: 'Alice',
				lastName: 'Smith',
				lastSeen,
			} as User;
			userRepository.findById.mockResolvedValue(user);
			privacyService.getSettings.mockResolvedValue(
				mockPrivacySettings({
					firstNamePrivacy: PrivacyLevel.CONTACTS,
					lastNamePrivacy: PrivacyLevel.CONTACTS,
					lastSeenPrivacy: PrivacyLevel.CONTACTS,
				})
			);
			contactsService.isContact.mockResolvedValue(true);

			const result = await service.getProfileWithPrivacy('uuid-1', 'uuid-2');

			expect(result.firstName).toBe('Alice');
			expect(result.lastName).toBe('Smith');
			expect(result.lastSeen).toBe(lastSeen);
		});

		it('masks CONTACTS fields when requester is not a contact', async () => {
			const user = {
				...mockUser(),
				firstName: 'Alice',
				lastName: 'Smith',
				lastSeen: new Date(),
			} as User;
			userRepository.findById.mockResolvedValue(user);
			privacyService.getSettings.mockResolvedValue(
				mockPrivacySettings({
					firstNamePrivacy: PrivacyLevel.CONTACTS,
					lastNamePrivacy: PrivacyLevel.CONTACTS,
					lastSeenPrivacy: PrivacyLevel.CONTACTS,
				})
			);
			contactsService.isContact.mockResolvedValue(false);

			const result = await service.getProfileWithPrivacy('uuid-1', 'uuid-2');

			expect(result.firstName).toBeNull();
			expect(result.lastName).toBeNull();
			expect(result.lastSeen).toBeNull();
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.getProfileWithPrivacy('uuid-1', 'uuid-2')).rejects.toThrow(
				NotFoundException
			);
		});

		it('does not mutate the original user entity', async () => {
			const user = {
				...mockUser(),
				firstName: 'Alice',
			} as User;
			userRepository.findById.mockResolvedValue(user);
			privacyService.getSettings.mockResolvedValue(
				mockPrivacySettings({ firstNamePrivacy: PrivacyLevel.NOBODY })
			);
			contactsService.isContact.mockResolvedValue(false);

			await service.getProfileWithPrivacy('uuid-1', 'uuid-2');

			expect(user.firstName).toBe('Alice');
		});
	});
});
