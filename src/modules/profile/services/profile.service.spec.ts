import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UserRepository } from '../../common/repositories';
import { MediaClientService, MediaMetadata } from './media-client.service';
import { SearchIndexService } from '../../cache/search-index.service';
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
	url: 'https://cdn.whispr.epitech.beer/avatars/media-uuid-1.webp',
	thumbnailUrl: null,
	context: 'avatar',
	mimeType: 'image/webp',
	sizeBytes: 12345,
	ownerId: 'uuid-1',
	...overrides,
});

describe('ProfileService', () => {
	let service: ProfileService;
	let userRepository: jest.Mocked<UserRepository>;
	let mediaClient: jest.Mocked<MediaClientService>;
	let searchIndexService: {
		indexUser: jest.Mock;
		removeUserFromIndex: jest.Mock;
		removeStaleIndexKeys: jest.Mock;
	};

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
					},
				},
				{
					provide: SearchIndexService,
					useValue: {
						indexUser: jest.fn().mockResolvedValue(undefined),
						removeUserFromIndex: jest.fn().mockResolvedValue(undefined),
						removeStaleIndexKeys: jest.fn().mockResolvedValue(undefined),
					},
				},
			],
		}).compile();

		service = module.get<ProfileService>(ProfileService);
		userRepository = module.get(UserRepository);
		mediaClient = module.get(MediaClientService);
		searchIndexService = module.get(SearchIndexService);
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

		it('removes only stale index keys when username changes', async () => {
			const user = { ...mockUser(), username: 'old-name' } as User;
			const dto: UpdateProfileDto = { username: 'new-name' };
			const saved = { ...user, username: 'new-name' } as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.findByUsernameInsensitive.mockResolvedValue(null);
			userRepository.save.mockResolvedValue(saved);

			await service.updateProfile('uuid-1', dto);

			expect(searchIndexService.removeUserFromIndex).not.toHaveBeenCalled();
			expect(searchIndexService.removeStaleIndexKeys).toHaveBeenCalledWith(
				expect.objectContaining({ username: 'old-name' }),
				expect.objectContaining({ username: 'new-name' })
			);
		});

		it('passes a lean UserIndexSnapshot (no relations or extra fields) as the old snapshot', async () => {
			const user = {
				...mockUser(),
				username: 'old-name',
				privacySettings: { showLastSeen: true } as any,
				biography: 'secret bio',
			} as User;
			const dto: UpdateProfileDto = { username: 'new-name' };
			const saved = { ...user, username: 'new-name' } as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.findByUsernameInsensitive.mockResolvedValue(null);
			userRepository.save.mockResolvedValue(saved);

			await service.updateProfile('uuid-1', dto);

			const [oldSnapshot] = searchIndexService.removeStaleIndexKeys.mock.calls[0];
			expect(Object.keys(oldSnapshot).sort()).toEqual([
				'createdAt',
				'firstName',
				'id',
				'lastName',
				'phoneNumber',
				'username',
			]);
			expect(oldSnapshot).not.toHaveProperty('privacySettings');
			expect(oldSnapshot).not.toHaveProperty('biography');
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
		it('resolves avatarMediaId to profilePictureUrl via media-service', async () => {
			const user = mockUser();
			const metadata = mockMediaMetadata();
			const dto: UpdateProfileDto = { avatarMediaId: 'media-uuid-1' };

			userRepository.findById.mockResolvedValue(user);
			mediaClient.getMediaMetadata.mockResolvedValue(metadata);
			userRepository.save.mockImplementation(async (u) => u as User);

			const result = await service.updateProfile('uuid-1', dto);

			expect(mediaClient.getMediaMetadata).toHaveBeenCalledWith('media-uuid-1', 'uuid-1', undefined);
			expect(result.profilePictureUrl).toBe(metadata.url);
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
			userRepository.save.mockImplementation(async (u) => u as User);

			await service.updateProfile('uuid-1', dto);

			const savedArg = userRepository.save.mock.calls[0][0] as any;
			expect(savedArg.avatarMediaId).toBeUndefined();
			expect(savedArg.firstName).toBe('Alice');
			expect(savedArg.profilePictureUrl).toBe(metadata.url);
		});
	});
});
