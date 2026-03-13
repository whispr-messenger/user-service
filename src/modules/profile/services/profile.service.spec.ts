import { Test, TestingModule } from '@nestjs/testing';
import {
	NotFoundException,
	ConflictException,
	ForbiddenException,
	BadRequestException,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UserRepository } from '../../common/repositories';
import { PrivacySettingsRepository } from '../../privacy/repositories/privacy-settings.repository';
import { ContactsRepository } from '../../contacts/repositories/contacts.repository';
import { BlockedUsersRepository } from '../../blocked-users/repositories/blocked-users.repository';
import { User } from '../../common/entities/user.entity';
import {
	PrivacySettings,
	PrivacyLevel,
	MediaAutoDownload,
} from '../../privacy/entities/privacy-settings.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UploadPhotoDto } from '../dto/upload-photo.dto';
import { ChangePhoneDto } from '../dto/change-phone.dto';

const mockUser = (overrides: Partial<User> = {}): User =>
	({
		id: 'uuid-1',
		phoneNumber: '+33600000001',
		username: null,
		firstName: 'John',
		lastName: 'Doe',
		biography: 'Hello',
		profilePictureUrl: 'https://example.com/photo.jpg',
		lastSeen: new Date('2025-01-01'),
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}) as User;

const mockSettings = (overrides: Partial<PrivacySettings> = {}): PrivacySettings =>
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
		...overrides,
	}) as PrivacySettings;

describe('ProfileService', () => {
	let service: ProfileService;
	let userRepository: jest.Mocked<UserRepository>;
	let privacySettingsRepository: jest.Mocked<PrivacySettingsRepository>;
	let contactsRepository: jest.Mocked<ContactsRepository>;
	let blockedUsersRepository: jest.Mocked<BlockedUsersRepository>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ProfileService,
				{
					provide: UserRepository,
					useValue: {
						findById: jest.fn(),
						findByUsernameInsensitive: jest.fn(),
						findByPhoneNumber: jest.fn(),
						save: jest.fn(),
						create: jest.fn(),
					},
				},
				{
					provide: PrivacySettingsRepository,
					useValue: {
						findByUserId: jest.fn(),
					},
				},
				{
					provide: ContactsRepository,
					useValue: {
						isContact: jest.fn(),
					},
				},
				{
					provide: BlockedUsersRepository,
					useValue: {
						isBlockedEitherWay: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<ProfileService>(ProfileService);
		userRepository = module.get(UserRepository);
		privacySettingsRepository = module.get(PrivacySettingsRepository);
		contactsRepository = module.get(ContactsRepository);
		blockedUsersRepository = module.get(BlockedUsersRepository);
	});

	describe('getProfile', () => {
		it('returns the user when found', async () => {
			const user = mockUser();
			userRepository.findById.mockResolvedValue(user);

			const result = await service.getProfile('uuid-1');

			expect(result).toBe(user);
			expect(userRepository.findById).toHaveBeenCalledWith('uuid-1');
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.getProfile('uuid-1')).rejects.toThrow(NotFoundException);
		});
	});

	describe('getProfileForRequester', () => {
		it('returns full profile when requester is the target', async () => {
			const user = mockUser();
			userRepository.findById.mockResolvedValue(user);

			const result = await service.getProfileForRequester('uuid-1', 'uuid-1');

			expect(result.firstName).toBe('John');
			expect(result.lastName).toBe('Doe');
			expect(result.biography).toBe('Hello');
			expect(result.profilePictureUrl).toBe('https://example.com/photo.jpg');
		});

		it('throws ForbiddenException when users have blocked each other', async () => {
			const user = mockUser();
			userRepository.findById.mockResolvedValue(user);
			blockedUsersRepository.isBlockedEitherWay.mockResolvedValue(true);

			await expect(service.getProfileForRequester('uuid-1', 'uuid-2')).rejects.toThrow(
				ForbiddenException
			);
		});

		it('filters fields based on privacy settings for non-contacts', async () => {
			const user = mockUser();
			const settings = mockSettings({
				firstNamePrivacy: PrivacyLevel.EVERYONE,
				lastNamePrivacy: PrivacyLevel.CONTACTS,
				biographyPrivacy: PrivacyLevel.NOBODY,
				profilePicturePrivacy: PrivacyLevel.CONTACTS,
				lastSeenPrivacy: PrivacyLevel.NOBODY,
			});

			userRepository.findById.mockResolvedValue(user);
			blockedUsersRepository.isBlockedEitherWay.mockResolvedValue(false);
			contactsRepository.isContact.mockResolvedValue(false);
			privacySettingsRepository.findByUserId.mockResolvedValue(settings);

			const result = await service.getProfileForRequester('uuid-1', 'uuid-2');

			expect(result.firstName).toBe('John');
			expect(result.lastName).toBeNull();
			expect(result.biography).toBeNull();
			expect(result.profilePictureUrl).toBeNull();
			expect(result.lastSeen).toBeNull();
		});

		it('shows contacts-only fields when requester is a contact', async () => {
			const user = mockUser();
			const settings = mockSettings({
				lastNamePrivacy: PrivacyLevel.CONTACTS,
				profilePicturePrivacy: PrivacyLevel.CONTACTS,
			});

			userRepository.findById.mockResolvedValue(user);
			blockedUsersRepository.isBlockedEitherWay.mockResolvedValue(false);
			contactsRepository.isContact.mockResolvedValue(true);
			privacySettingsRepository.findByUserId.mockResolvedValue(settings);

			const result = await service.getProfileForRequester('uuid-1', 'uuid-2');

			expect(result.lastName).toBe('Doe');
			expect(result.profilePictureUrl).toBe('https://example.com/photo.jpg');
		});

		it('uses default privacy when no settings exist and requester is not a contact', async () => {
			const user = mockUser();

			userRepository.findById.mockResolvedValue(user);
			blockedUsersRepository.isBlockedEitherWay.mockResolvedValue(false);
			contactsRepository.isContact.mockResolvedValue(false);
			privacySettingsRepository.findByUserId.mockResolvedValue(null);

			const result = await service.getProfileForRequester('uuid-1', 'uuid-2');

			// defaults: firstName=everyone, lastName=contacts, bio=everyone, photo=everyone, lastSeen=contacts
			expect(result.firstName).toBe('John');
			expect(result.lastName).toBeNull();
			expect(result.biography).toBe('Hello');
			expect(result.profilePictureUrl).toBe('https://example.com/photo.jpg');
			expect(result.lastSeen).toBeNull();
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

		it('creates a new profile when user does not exist', async () => {
			const created = mockUser({ id: 'uuid-1', firstName: null, lastName: null });
			const dto: UpdateProfileDto = { firstName: 'Alice' };
			const saved = { ...created, ...dto } as User;

			userRepository.findById.mockResolvedValue(null);
			userRepository.create.mockResolvedValue(created);
			userRepository.save.mockResolvedValue(saved);

			const result = await service.updateProfile('uuid-1', dto);

			expect(userRepository.create).toHaveBeenCalledWith({ id: 'uuid-1' });
			expect(result).toBe(saved);
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

	describe('uploadPhoto', () => {
		it('sets the profile picture URL and saves', async () => {
			const user = mockUser({ profilePictureUrl: null });
			const dto: UploadPhotoDto = { profilePictureUrl: 'https://cdn.example.com/new.jpg' };
			const saved = { ...user, profilePictureUrl: dto.profilePictureUrl } as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.save.mockResolvedValue(saved);

			const result = await service.uploadPhoto('uuid-1', dto);

			expect(userRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({ profilePictureUrl: dto.profilePictureUrl })
			);
			expect(result).toBe(saved);
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(
				service.uploadPhoto('uuid-1', { profilePictureUrl: 'https://cdn.example.com/new.jpg' })
			).rejects.toThrow(NotFoundException);
		});
	});

	describe('deletePhoto', () => {
		it('clears the profile picture URL', async () => {
			const user = mockUser({ profilePictureUrl: 'https://cdn.example.com/old.jpg' });
			const saved = { ...user, profilePictureUrl: null } as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.save.mockResolvedValue(saved);

			const result = await service.deletePhoto('uuid-1');

			expect(userRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({ profilePictureUrl: null })
			);
			expect(result).toBe(saved);
		});
	});

	describe('changePhoneNumber', () => {
		it('updates the phone number', async () => {
			const user = mockUser({ phoneNumber: '+33600000001' });
			const dto: ChangePhoneDto = { phoneNumber: '+33600000002', verificationCode: '123456' };
			const saved = { ...user, phoneNumber: dto.phoneNumber } as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.findByPhoneNumber.mockResolvedValue(null);
			userRepository.save.mockResolvedValue(saved);

			const result = await service.changePhoneNumber('uuid-1', dto);

			expect(result).toBe(saved);
		});

		it('throws BadRequestException when new phone is the same as current', async () => {
			const user = mockUser({ phoneNumber: '+33600000001' });
			const dto: ChangePhoneDto = { phoneNumber: '+33600000001', verificationCode: '123456' };

			userRepository.findById.mockResolvedValue(user);

			await expect(service.changePhoneNumber('uuid-1', dto)).rejects.toThrow(BadRequestException);
		});

		it('throws ConflictException when phone number is already in use', async () => {
			const user = mockUser({ phoneNumber: '+33600000001' });
			const existingUser = mockUser({ id: 'uuid-2', phoneNumber: '+33600000002' });
			const dto: ChangePhoneDto = { phoneNumber: '+33600000002', verificationCode: '123456' };

			userRepository.findById.mockResolvedValue(user);
			userRepository.findByPhoneNumber.mockResolvedValue(existingUser);

			await expect(service.changePhoneNumber('uuid-1', dto)).rejects.toThrow(ConflictException);
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(
				service.changePhoneNumber('uuid-1', {
					phoneNumber: '+33600000002',
					verificationCode: '123456',
				})
			).rejects.toThrow(NotFoundException);
		});
	});
});
