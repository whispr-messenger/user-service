import { Test, TestingModule } from '@nestjs/testing';
import { BlockedUsersController } from './blocked-users.controller';
import { BlockedUsersService } from '../services/blocked-users.service';
import { BlockedUser } from '../entities/blocked-user.entity';
import { BlockUserDto } from '../dto/block-user.dto';

describe('BlockedUsersController', () => {
	let controller: BlockedUsersController;
	let service: jest.Mocked<BlockedUsersService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [BlockedUsersController],
			providers: [
				{
					provide: BlockedUsersService,
					useValue: {
						getBlockedUsers: jest.fn(),
						blockUser: jest.fn(),
						unblockUser: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<BlockedUsersController>(BlockedUsersController);
		service = module.get(BlockedUsersService);
	});

	describe('getBlockedUsers', () => {
		it('delegates to the service', async () => {
			const rows = [{ id: 'b1' }] as BlockedUser[];
			service.getBlockedUsers.mockResolvedValue(rows);

			const result = await controller.getBlockedUsers('blocker-1');

			expect(result).toBe(rows);
			expect(service.getBlockedUsers).toHaveBeenCalledWith('blocker-1');
		});
	});

	describe('blockUser', () => {
		it('delegates to the service', async () => {
			const dto: BlockUserDto = { blockedId: 'blocked-1' } as BlockUserDto;
			const created = { id: 'b1' } as BlockedUser;
			service.blockUser.mockResolvedValue(created);

			const result = await controller.blockUser('blocker-1', dto);

			expect(result).toBe(created);
			expect(service.blockUser).toHaveBeenCalledWith('blocker-1', dto);
		});
	});

	describe('unblockUser', () => {
		it('delegates to the service', async () => {
			service.unblockUser.mockResolvedValue(undefined);

			await controller.unblockUser('blocker-1', 'blocked-1');

			expect(service.unblockUser).toHaveBeenCalledWith('blocker-1', 'blocked-1');
		});
	});
});
