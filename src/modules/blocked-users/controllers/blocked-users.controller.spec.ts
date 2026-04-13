import { Test, TestingModule } from '@nestjs/testing';
import { BlockedUsersController } from './blocked-users.controller';
import { BlockedUsersService } from '../services/blocked-users.service';
import { BlockedUser } from '../entities/blocked-user.entity';
import { BlockUserDto } from '../dto/block-user.dto';

const makeReq = (sub: string) => ({ user: { sub } }) as any;

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
		it('delegates to the service using req.user.sub as blockerId', async () => {
			const rows = [{ id: 'b1' }] as BlockedUser[];
			service.getBlockedUsers.mockResolvedValue(rows);

			const result = await controller.getBlockedUsers(makeReq('blocker-1'));

			expect(result).toBe(rows);
			expect(service.getBlockedUsers).toHaveBeenCalledWith('blocker-1');
		});
	});

	describe('blockUser', () => {
		it('delegates to the service using req.user.sub as blockerId', async () => {
			const dto: BlockUserDto = { blockedId: 'blocked-1' } as BlockUserDto;
			const created = { id: 'b1' } as BlockedUser;
			service.blockUser.mockResolvedValue(created);

			const result = await controller.blockUser(dto, makeReq('blocker-1'));

			expect(result).toBe(created);
			expect(service.blockUser).toHaveBeenCalledWith('blocker-1', dto);
		});
	});

	describe('unblockUser', () => {
		it('delegates to the service using req.user.sub as blockerId', async () => {
			service.unblockUser.mockResolvedValue(undefined);

			await controller.unblockUser('blocked-1', makeReq('blocker-1'));

			expect(service.unblockUser).toHaveBeenCalledWith('blocker-1', 'blocked-1');
		});
	});
});
