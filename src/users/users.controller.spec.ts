import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrivacyService } from '../privacy/privacy.service';
import { CreateUserDto, UpdateUserDto, UpdatePrivacySettingsDto } from '../dto';
import { User, PrivacySettings } from '../entities';
import { UnauthorizedException } from '@nestjs/common';
import { PrivacyLevel } from '../entities/privacy-settings.entity';

describe('UsersController', () => {
	let controller: UsersController;

	const mockUser: User = {
		id: 'user-id',
		username: 'testuser',
		firstName: 'Test',
		lastName: 'User',
		phoneNumber: '+1234567890',
		isActive: true,
		lastSeen: new Date(),
		createdAt: new Date(),
		updatedAt: new Date(),
		privacySettings: new PrivacySettings(),
		contacts: [],
		blockedUsers: [],
		sentContactRequests: [],
		receivedContactRequests: [],
	} as unknown as User;

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

	const mockUsersService = {
		create: jest.fn(),
		getMe: jest.fn(),
		findAll: jest.fn(),
		searchUsers: jest.fn(),
		getProfile: jest.fn(),
		findByPhoneNumber: jest.fn(),
		findByUsername: jest.fn(),
		update: jest.fn(),
		updateLastSeen: jest.fn(),
		deactivate: jest.fn(),
		activate: jest.fn(),
		remove: jest.fn(),
	};

	const mockPrivacyService = {
		getPrivacySettings: jest.fn(),
		updatePrivacySettings: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [UsersController],
			providers: [
				{
					provide: UsersService,
					useValue: mockUsersService,
				},
				{
					provide: PrivacyService,
					useValue: mockPrivacyService,
				},
			],
		}).compile();

		controller = module.get<UsersController>(UsersController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('create', () => {
		it('should create a new user', async () => {
			const createUserDto: CreateUserDto = {
				username: 'testuser',
				phoneNumber: '+1234567890',
				firstName: 'Test',
			};
			mockUsersService.create.mockResolvedValue(mockUser);

			const result = await controller.create(createUserDto);
			expect(result).toEqual(mockUser);
			expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
		});
	});

	describe('getMe', () => {
		it('should return current user profile', async () => {
			const req = { user: { id: 'user-id' } };
			mockUsersService.getMe.mockResolvedValue(mockUser);

			const result = await controller.getMe(req);
			expect(result).toEqual(mockUser);
			expect(mockUsersService.getMe).toHaveBeenCalledWith('user-id');
		});

		it('should throw UnauthorizedException if no user id', async () => {
			const req = { user: {}, headers: {} };
			await expect(controller.getMe(req)).rejects.toThrow(UnauthorizedException);
		});
	});

	describe('getMyPrivacySettings', () => {
		it('should return current user privacy settings', async () => {
			const req = { user: { id: 'user-id' } };
			mockPrivacyService.getPrivacySettings.mockResolvedValue(mockPrivacySettings);

			const result = await controller.getMyPrivacySettings(req);
			expect(result).toEqual(mockPrivacySettings);
			expect(mockPrivacyService.getPrivacySettings).toHaveBeenCalledWith('user-id');
		});

		it('should throw UnauthorizedException if no user id', async () => {
			const req = { user: {}, headers: {} };
			await expect(controller.getMyPrivacySettings(req)).rejects.toThrow(UnauthorizedException);
		});
	});

	describe('updateMyPrivacySettings', () => {
		it('should update current user privacy settings', async () => {
			const req = { user: { id: 'user-id' } };
			const updateDto: UpdatePrivacySettingsDto = { profilePicturePrivacy: PrivacyLevel.CONTACTS };
			mockPrivacyService.updatePrivacySettings.mockResolvedValue({
				...mockPrivacySettings,
				...updateDto,
			});

			const result = await controller.updateMyPrivacySettings(req, updateDto);
			expect(result).toEqual({ ...mockPrivacySettings, ...updateDto });
			expect(mockPrivacyService.updatePrivacySettings).toHaveBeenCalledWith('user-id', updateDto);
		});
	});

	describe('findAll', () => {
		it('should return all users with pagination', async () => {
			const resultMock = { users: [mockUser], total: 1 };
			mockUsersService.findAll.mockResolvedValue(resultMock);

			const result = await controller.findAll(1, 10);
			expect(result).toEqual(resultMock);
			expect(mockUsersService.findAll).toHaveBeenCalledWith(1, 10);
		});
	});

	describe('search', () => {
		it('should search users', async () => {
			const req = { user: { id: 'user-id' } };
			const resultMock = { users: [mockUser], total: 1 };
			mockUsersService.searchUsers.mockResolvedValue(resultMock);

			const result = await controller.search('query', req, 1, 20);
			expect(result).toEqual(resultMock);
			expect(mockUsersService.searchUsers).toHaveBeenCalledWith('query', 'user-id', 1, 20);
		});
	});

	describe('findOne', () => {
		it('should return user profile', async () => {
			const req = { user: { id: 'requester-id' } };
			mockUsersService.getProfile.mockResolvedValue(mockUser);

			const result = await controller.findOne('target-id', req);
			expect(result).toEqual(mockUser);
			expect(mockUsersService.getProfile).toHaveBeenCalledWith('target-id', 'requester-id');
		});
	});

	describe('update', () => {
		it('should update user', async () => {
			const req = { user: { id: 'user-id' } };
			const updateDto: UpdateUserDto = { username: 'newname' };
			mockUsersService.update.mockResolvedValue({ ...mockUser, ...updateDto });

			const result = await controller.update('user-id', updateDto, req);
			expect(result).toEqual({ ...mockUser, ...updateDto });
			expect(mockUsersService.update).toHaveBeenCalledWith('user-id', updateDto);
		});

		it('should throw UnauthorizedException if updating another user', async () => {
			const req = { user: { id: 'user-id' } };
			const updateDto: UpdateUserDto = { username: 'newname' };

			await expect(controller.update('other-id', updateDto, req)).rejects.toThrow(
				UnauthorizedException
			);
		});
	});

	describe('findByPhoneNumber', () => {
		it('should find user by phone number', async () => {
			mockUsersService.findByPhoneNumber.mockResolvedValue(mockUser);
			const result = await controller.findByPhoneNumber('+123');
			expect(result).toEqual(mockUser);
			expect(mockUsersService.findByPhoneNumber).toHaveBeenCalledWith('+123');
		});
	});

	describe('findByUsername', () => {
		it('should find user by username', async () => {
			mockUsersService.findByUsername.mockResolvedValue(mockUser);
			const result = await controller.findByUsername('user');
			expect(result).toEqual(mockUser);
			expect(mockUsersService.findByUsername).toHaveBeenCalledWith('user');
		});
	});

	describe('updateLastSeen', () => {
		it('should update last seen', async () => {
			mockUsersService.updateLastSeen.mockResolvedValue(undefined);
			await controller.updateLastSeen('user-id');
			expect(mockUsersService.updateLastSeen).toHaveBeenCalledWith('user-id');
		});
	});

	describe('deactivate', () => {
		it('should deactivate user', async () => {
			mockUsersService.deactivate.mockResolvedValue(undefined);
			await controller.deactivate('user-id');
			expect(mockUsersService.deactivate).toHaveBeenCalledWith('user-id');
		});
	});

	describe('activate', () => {
		it('should activate user', async () => {
			mockUsersService.activate.mockResolvedValue(undefined);
			await controller.activate('user-id');
			expect(mockUsersService.activate).toHaveBeenCalledWith('user-id');
		});
	});

	describe('remove', () => {
		it('should remove user', async () => {
			mockUsersService.remove.mockResolvedValue(undefined);
			await controller.remove('user-id');
			expect(mockUsersService.remove).toHaveBeenCalledWith('user-id');
		});
	});
});
