import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { BlockedUsersService } from './blocked-users.service';
import { UserRepository } from '../../common/repositories';
import { BlockedUsersRepository } from '../repositories/blocked-users.repository';
import { BlockedUser } from '../entities/blocked-user.entity';
import { User } from '../../common/entities/user.entity';
import { BlockUserDto } from '../dto/block-user.dto';

const mockUser = (id: string = 'uuid-1'): User =>
	({
		id,
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

const mockBlockedUser = (): BlockedUser =>
	({
		id: 'blocked-uuid-1',
		blockerId: 'uuid-1',
		blockedId: 'uuid-2',
		createdAt: new Date(),
	}) as BlockedUser;

describe('BlockedUsersService', () => {
	let service: BlockedUsersService;
	let userRepository: jest.Mocked<UserRepository>;
	let blockedUsersRepository: jest.Mocked<BlockedUsersRepository>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				BlockedUsersService,
				{
					provide: UserRepository,
					useValue: {
						findById: jest.fn(),
					},
				},
				{
					provide: BlockedUsersRepository,
					useValue: {
						findAllByBlockerPaginated: jest.fn(),
						findOne: jest.fn(),
						create: jest.fn(),
						remove: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get<BlockedUsersService>(BlockedUsersService);
		userRepository = module.get(UserRepository);
		blockedUsersRepository = module.get(BlockedUsersRepository);
	});

	describe('getBlockedUsers', () => {
		it('returns blocked users for a valid blocker', async () => {
			const user = mockUser();
			const blocked = [mockBlockedUser()];
			const paginated = { data: blocked, nextCursor: null, hasMore: false };
			userRepository.findById.mockResolvedValue(user);
			blockedUsersRepository.findAllByBlockerPaginated.mockResolvedValue(paginated);

			const result = await service.getBlockedUsers('uuid-1');

			expect(result).toEqual(paginated);
			expect(blockedUsersRepository.findAllByBlockerPaginated).toHaveBeenCalledWith(
				'uuid-1',
				50,
				undefined
			);
		});

		it('passes limit and cursor to repository', async () => {
			const user = mockUser();
			const paginated = { data: [], nextCursor: null, hasMore: false };
			userRepository.findById.mockResolvedValue(user);
			blockedUsersRepository.findAllByBlockerPaginated.mockResolvedValue(paginated);

			await service.getBlockedUsers('uuid-1', 10, 'some-cursor');

			expect(blockedUsersRepository.findAllByBlockerPaginated).toHaveBeenCalledWith(
				'uuid-1',
				10,
				'some-cursor'
			);
		});

		it('throws NotFoundException when blocker does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.getBlockedUsers('uuid-1')).rejects.toThrow(NotFoundException);
		});
	});

	describe('blockUser', () => {
		it('blocks and returns the blocked user entry', async () => {
			const blocker = mockUser('uuid-1');
			const blockedUser = mockUser('uuid-2');
			const entry = mockBlockedUser();
			const dto: BlockUserDto = { blockedId: 'uuid-2' };

			userRepository.findById.mockResolvedValueOnce(blocker).mockResolvedValueOnce(blockedUser);
			blockedUsersRepository.findOne.mockResolvedValue(null);
			blockedUsersRepository.create.mockResolvedValue(entry);

			const result = await service.blockUser('uuid-1', dto);

			expect(result).toBe(entry);
			expect(blockedUsersRepository.create).toHaveBeenCalledWith('uuid-1', 'uuid-2');
		});

		it('throws BadRequestException when user blocks themselves', async () => {
			const dto: BlockUserDto = { blockedId: 'uuid-1' };

			await expect(service.blockUser('uuid-1', dto)).rejects.toThrow(BadRequestException);
		});

		it('throws NotFoundException when blocker does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.blockUser('uuid-1', { blockedId: 'uuid-2' })).rejects.toThrow(
				NotFoundException
			);
		});

		it('throws NotFoundException when target user does not exist', async () => {
			const blocker = mockUser('uuid-1');
			userRepository.findById.mockResolvedValueOnce(blocker).mockResolvedValueOnce(null);

			await expect(service.blockUser('uuid-1', { blockedId: 'uuid-2' })).rejects.toThrow(
				NotFoundException
			);
		});

		it('throws ConflictException when user is already blocked', async () => {
			const blocker = mockUser('uuid-1');
			const blockedUser = mockUser('uuid-2');
			const existing = mockBlockedUser();

			userRepository.findById.mockResolvedValueOnce(blocker).mockResolvedValueOnce(blockedUser);
			blockedUsersRepository.findOne.mockResolvedValue(existing);

			await expect(service.blockUser('uuid-1', { blockedId: 'uuid-2' })).rejects.toThrow(
				ConflictException
			);
		});
	});

	describe('unblockUser', () => {
		it('removes the blocked user entry when it exists', async () => {
			const blocker = mockUser('uuid-1');
			const entry = mockBlockedUser();

			userRepository.findById.mockResolvedValue(blocker);
			blockedUsersRepository.findOne.mockResolvedValue(entry);

			await service.unblockUser('uuid-1', 'uuid-2');

			expect(blockedUsersRepository.remove).toHaveBeenCalledWith(entry);
		});

		it('throws NotFoundException when blocker does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.unblockUser('uuid-1', 'uuid-2')).rejects.toThrow(NotFoundException);
		});

		it('throws NotFoundException when blocked entry does not exist', async () => {
			const blocker = mockUser('uuid-1');

			userRepository.findById.mockResolvedValue(blocker);
			blockedUsersRepository.findOne.mockResolvedValue(null);

			await expect(service.unblockUser('uuid-1', 'uuid-2')).rejects.toThrow(NotFoundException);
		});
	});
});
