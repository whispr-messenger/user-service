import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from '../services/accounts.service';
import { UserRegisteredRetryService } from '../services/user-registered-retry.service';
import { UserRegisteredEvent } from 'src/modules/shared/events';

const makeReq = (sub: string) => ({ user: { sub } }) as any;

const mockAccountsService = (): jest.Mocked<AccountsService> =>
	({
		createFromEvent: jest.fn(),
		updateLastSeen: jest.fn(),
		deactivate: jest.fn(),
		activate: jest.fn(),
		remove: jest.fn(),
	}) as unknown as jest.Mocked<AccountsService>;

const mockUserRegisteredRetryService = (): jest.Mocked<UserRegisteredRetryService> =>
	({ handleWithRetry: jest.fn() }) as unknown as jest.Mocked<UserRegisteredRetryService>;

describe('AccountsController', () => {
	let controller: AccountsController;
	let accountsService: jest.Mocked<AccountsService>;
	let retryService: jest.Mocked<UserRegisteredRetryService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AccountsController],
			providers: [
				{ provide: AccountsService, useFactory: mockAccountsService },
				{ provide: UserRegisteredRetryService, useFactory: mockUserRegisteredRetryService },
			],
		}).compile();

		controller = module.get<AccountsController>(AccountsController);
		accountsService = module.get(AccountsService);
		retryService = module.get(UserRegisteredRetryService);
	});

	describe('createUserAccount', () => {
		const event: UserRegisteredEvent = new UserRegisteredEvent('uuid-1', '+33600000001');

		it('delegates to userRegisteredRetryService.handleWithRetry', async () => {
			retryService.handleWithRetry.mockResolvedValue(undefined);

			const result = await controller.createUserAccount(event);

			expect(retryService.handleWithRetry).toHaveBeenCalledWith(event);
			expect(result).toBeUndefined();
		});

		it('resolves without throwing when retry service rejects', async () => {
			retryService.handleWithRetry.mockRejectedValue(new Error('unexpected'));

			await expect(controller.createUserAccount(event)).rejects.toThrow('unexpected');
		});
	});

	describe('updateLastSeen', () => {
		it('delegates to accountsService.updateLastSeen', async () => {
			accountsService.updateLastSeen.mockResolvedValue(undefined);

			await controller.updateLastSeen('uuid-1', makeReq('uuid-1'));

			expect(accountsService.updateLastSeen).toHaveBeenCalledWith('uuid-1');
		});

		it('throws ForbiddenException when caller is not the owner', async () => {
			await expect(controller.updateLastSeen('uuid-1', makeReq('attacker'))).rejects.toThrow(
				ForbiddenException
			);
		});
	});

	describe('deactivate', () => {
		it('delegates to accountsService.deactivate', async () => {
			accountsService.deactivate.mockResolvedValue(undefined);

			await controller.deactivate('uuid-1', makeReq('uuid-1'));

			expect(accountsService.deactivate).toHaveBeenCalledWith('uuid-1');
		});

		it('throws ForbiddenException when caller is not the owner', async () => {
			await expect(controller.deactivate('uuid-1', makeReq('attacker'))).rejects.toThrow(
				ForbiddenException
			);
		});

		it('propagates NotFoundException from service', async () => {
			accountsService.deactivate.mockRejectedValue(new NotFoundException());

			await expect(controller.deactivate('uuid-404', makeReq('uuid-404'))).rejects.toThrow(
				NotFoundException
			);
		});
	});

	describe('activate', () => {
		it('delegates to accountsService.activate', async () => {
			accountsService.activate.mockResolvedValue(undefined);

			await controller.activate('uuid-1', makeReq('uuid-1'));

			expect(accountsService.activate).toHaveBeenCalledWith('uuid-1');
		});

		it('throws ForbiddenException when caller is not the owner', async () => {
			await expect(controller.activate('uuid-1', makeReq('attacker'))).rejects.toThrow(
				ForbiddenException
			);
		});

		it('propagates NotFoundException from service', async () => {
			accountsService.activate.mockRejectedValue(new NotFoundException());

			await expect(controller.activate('uuid-404', makeReq('uuid-404'))).rejects.toThrow(
				NotFoundException
			);
		});
	});

	describe('remove', () => {
		it('delegates to accountsService.remove', async () => {
			accountsService.remove.mockResolvedValue(undefined);

			await controller.remove('uuid-1', makeReq('uuid-1'));

			expect(accountsService.remove).toHaveBeenCalledWith('uuid-1');
		});

		it('throws ForbiddenException when caller is not the owner', async () => {
			await expect(controller.remove('uuid-1', makeReq('attacker'))).rejects.toThrow(
				ForbiddenException
			);
		});

		it('propagates NotFoundException from service', async () => {
			accountsService.remove.mockRejectedValue(new NotFoundException());

			await expect(controller.remove('uuid-404', makeReq('uuid-404'))).rejects.toThrow(
				NotFoundException
			);
		});
	});
});
