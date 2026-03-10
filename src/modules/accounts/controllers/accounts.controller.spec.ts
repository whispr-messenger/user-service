import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from '../services/accounts.service';
import { UserRegisteredEvent } from 'src/modules/shared/events';

const mockAccountsService = (): jest.Mocked<AccountsService> =>
	({
		createFromEvent: jest.fn(),
		updateLastSeen: jest.fn(),
		deactivate: jest.fn(),
		activate: jest.fn(),
		remove: jest.fn(),
	}) as unknown as jest.Mocked<AccountsService>;

describe('AccountsController', () => {
	let controller: AccountsController;
	let accountsService: jest.Mocked<AccountsService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AccountsController],
			providers: [{ provide: AccountsService, useFactory: mockAccountsService }],
		}).compile();

		controller = module.get<AccountsController>(AccountsController);
		accountsService = module.get(AccountsService);
	});

	describe('createUserAccount', () => {
		const event: UserRegisteredEvent = new UserRegisteredEvent('uuid-1', '+33600000001');

		it('calls createFromEvent and returns nothing on success', async () => {
			accountsService.createFromEvent.mockResolvedValue({
				id: 'uuid-1',
				phoneNumber: '+33600000001',
			} as any);

			const result = await controller.createUserAccount(event);

			expect(accountsService.createFromEvent).toHaveBeenCalledWith(event);
			expect(result).toBeUndefined();
		});

		it('swallows errors thrown by createFromEvent without rethrowing', async () => {
			accountsService.createFromEvent.mockRejectedValue(new Error('DB failure'));

			await expect(controller.createUserAccount(event)).resolves.toBeUndefined();
		});
	});

	describe('updateLastSeen', () => {
		it('delegates to accountsService.updateLastSeen', async () => {
			accountsService.updateLastSeen.mockResolvedValue(undefined);

			await controller.updateLastSeen('uuid-1');

			expect(accountsService.updateLastSeen).toHaveBeenCalledWith('uuid-1');
		});
	});

	describe('deactivate', () => {
		it('delegates to accountsService.deactivate', async () => {
			accountsService.deactivate.mockResolvedValue(undefined);

			await controller.deactivate('uuid-1');

			expect(accountsService.deactivate).toHaveBeenCalledWith('uuid-1');
		});

		it('propagates NotFoundException from service', async () => {
			accountsService.deactivate.mockRejectedValue(new NotFoundException());

			await expect(controller.deactivate('uuid-404')).rejects.toThrow(NotFoundException);
		});
	});

	describe('activate', () => {
		it('delegates to accountsService.activate', async () => {
			accountsService.activate.mockResolvedValue(undefined);

			await controller.activate('uuid-1');

			expect(accountsService.activate).toHaveBeenCalledWith('uuid-1');
		});

		it('propagates NotFoundException from service', async () => {
			accountsService.activate.mockRejectedValue(new NotFoundException());

			await expect(controller.activate('uuid-404')).rejects.toThrow(NotFoundException);
		});
	});

	describe('remove', () => {
		it('delegates to accountsService.remove', async () => {
			accountsService.remove.mockResolvedValue(undefined);

			await controller.remove('uuid-1');

			expect(accountsService.remove).toHaveBeenCalledWith('uuid-1');
		});

		it('propagates NotFoundException from service', async () => {
			accountsService.remove.mockRejectedValue(new NotFoundException());

			await expect(controller.remove('uuid-404')).rejects.toThrow(NotFoundException);
		});
	});
});
