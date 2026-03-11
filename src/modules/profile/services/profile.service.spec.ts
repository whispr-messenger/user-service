import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UserRepository } from '../../common/repositories';
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

describe('ProfileService', () => {
	let service: ProfileService;
	let userRepository: jest.Mocked<UserRepository>;

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
			],
		}).compile();

		service = module.get<ProfileService>(ProfileService);
		userRepository = module.get(UserRepository);
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
});
