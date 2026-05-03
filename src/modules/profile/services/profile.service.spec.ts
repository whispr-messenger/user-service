import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UserRepository } from '../../common/repositories';
import { MediaClientService, MediaMetadata } from './media-client.service';
import { SearchIndexService } from '../../cache/search-index.service';
import { CacheService } from '../../cache/cache.service';
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
		visualPreferences: null,
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
	let searchIndexService: { indexUser: jest.Mock; removeUserFromIndex: jest.Mock };
	let cacheService: { get: jest.Mock; pipeline: jest.Mock; delMany: jest.Mock };

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
					},
				},
				{
					provide: CacheService,
					useValue: {
						get: jest.fn().mockResolvedValue(null),
						pipeline: jest.fn().mockResolvedValue(undefined),
						delMany: jest.fn().mockResolvedValue(undefined),
					},
				},
			],
		}).compile();

		service = module.get<ProfileService>(ProfileService);
		userRepository = module.get(UserRepository);
		mediaClient = module.get(MediaClientService);
		searchIndexService = module.get(SearchIndexService);
		cacheService = module.get(CacheService);
	});

	describe('getProfile', () => {
		it('returns the user when found', async () => {
			const user = mockUser();
			cacheService.get.mockResolvedValue(null);
			userRepository.findById.mockResolvedValue(user);

			const result = await service.getProfile('uuid-1');

			expect(result).toBe(user);
			expect(userRepository.findById).toHaveBeenCalledWith('uuid-1');
			expect(cacheService.pipeline).toHaveBeenCalledWith(
				expect.arrayContaining([
					['setex', 'profile:cache:uuid-1', 300, JSON.stringify(user)],
				])
			);
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.getProfile('uuid-1')).rejects.toThrow(NotFoundException);
		});

		it('returns the cached profile when available', async () => {
			const user = mockUser();
			cacheService.get.mockResolvedValue(user);

			const result = await service.getProfile('uuid-1');

			expect(result).toBe(user);
			expect(userRepository.findById).not.toHaveBeenCalled();
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
			expect(cacheService.delMany).toHaveBeenCalledWith(['profile:cache:uuid-1']);
			expect(cacheService.pipeline).toHaveBeenCalledWith(
				expect.arrayContaining([
					['setex', 'profile:cache:uuid-1', 300, JSON.stringify(saved)],
				])
			);
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

		it('stores synchronized visual preferences on the user profile', async () => {
			const user = mockUser();
			const dto: UpdateProfileDto = {
				visualPreferences: {
					theme: 'light',
					language: 'en',
					fontSize: 'large',
					backgroundPreset: 'midnight',
					updatedAt: '2026-05-02T15:00:00.000Z',
				},
			};
			const saved = {
				...user,
				visualPreferences: dto.visualPreferences,
			} as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.save.mockResolvedValue(saved);

			const result = await service.updateProfile('uuid-1', dto);

			expect(userRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					visualPreferences: expect.objectContaining({
						theme: 'light',
						language: 'en',
						fontSize: 'large',
						backgroundPreset: 'midnight',
						updatedAt: '2026-05-02T15:00:00.000Z',
					}),
				})
			);
			expect(result.visualPreferences).toEqual(dto.visualPreferences);
		});

		it('maps legacy background fields into visual preferences for backward compatibility', async () => {
			const user = mockUser();
			const dto: UpdateProfileDto = {
				backgroundMediaId: '2e8c81c8-3a4f-4b5f-8ae4-e138f4bb96b6',
				backgroundMediaUrl: 'https://cdn.whispr/background.jpg',
				visualPreferences: {
					backgroundPreset: 'custom',
					updatedAt: '2026-05-02T16:00:00.000Z',
				},
			};
			const saved = {
				...user,
				visualPreferences: {
					backgroundPreset: 'custom',
					backgroundMediaId: dto.backgroundMediaId,
					backgroundMediaUrl: dto.backgroundMediaUrl,
					updatedAt: '2026-05-02T16:00:00.000Z',
				},
			} as User;

			userRepository.findById.mockResolvedValue(user);
			userRepository.save.mockResolvedValue(saved);

			const result = await service.updateProfile('uuid-1', dto);

			expect(result.visualPreferences).toEqual(
				expect.objectContaining({
					backgroundPreset: 'custom',
					backgroundMediaId: dto.backgroundMediaId,
					backgroundMediaUrl: dto.backgroundMediaUrl,
				})
			);
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

			expect(mediaClient.getMediaMetadata).toHaveBeenCalledWith(
				'media-uuid-1',
				'uuid-1',
				undefined,
				undefined
			);
			expect(result.profilePictureUrl).toBe(metadata.url);
		});

		it('falls back to gateway blob URL when media-service returns 404 and requestBaseUrl is provided', async () => {
			const user = mockUser();
			const dto: UpdateProfileDto = { avatarMediaId: 'media-uuid-1' };

			userRepository.findById.mockResolvedValue(user);
			mediaClient.getMediaMetadata.mockRejectedValue({
				status: 404,
				message: 'Media not found',
			});
			userRepository.save.mockImplementation(async (u) => u as User);

			const result = await service.updateProfile(
				'uuid-1',
				dto,
				'Bearer token',
				'https://api.test.local'
			);

			expect(result.profilePictureUrl).toBe('https://api.test.local/media/v1/media-uuid-1/blob');
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
