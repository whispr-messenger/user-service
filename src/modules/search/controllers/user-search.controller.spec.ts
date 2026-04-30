import { Test, TestingModule } from '@nestjs/testing';
import { UserSearchController } from './user-search.controller';
import { UserSearchService, UserSearchResult } from '../services/user-search.service';
import { User } from '../../common/entities/user.entity';
import { BatchPhoneSearchDto } from '../dto/batch-phone-search.dto';

describe('UserSearchController', () => {
	let controller: UserSearchController;
	let service: jest.Mocked<UserSearchService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [UserSearchController],
			providers: [
				{
					provide: UserSearchService,
					useValue: {
						searchByPhone: jest.fn(),
						searchByPhoneBatch: jest.fn(),
						searchByUsername: jest.fn(),
						searchByDisplayName: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<UserSearchController>(UserSearchController);
		service = module.get(UserSearchService);
	});

	describe('searchByPhone', () => {
		it('wraps the matched user in a { user } envelope', async () => {
			const user = { id: 'u1' } as User;
			service.searchByPhone.mockResolvedValue(user);

			const result = await controller.searchByPhone({ phoneNumber: '+33600000000' });

			expect(result).toEqual({ user });
			expect(service.searchByPhone).toHaveBeenCalledWith('+33600000000');
		});

		it('returns { user: null } when no user matches', async () => {
			service.searchByPhone.mockResolvedValue(null);

			const result = await controller.searchByPhone({ phoneNumber: '+33600000000' });

			expect(result).toEqual({ user: null });
		});
	});

	describe('searchByPhoneBatch', () => {
		it('forwards the phone numbers from the dto', async () => {
			const users = [{ id: 'u1' }] as User[];
			service.searchByPhoneBatch.mockResolvedValue(users);
			const dto: BatchPhoneSearchDto = { phoneNumbers: ['+33600000000'] } as BatchPhoneSearchDto;

			const result = await controller.searchByPhoneBatch(dto);

			expect(result).toBe(users);
			expect(service.searchByPhoneBatch).toHaveBeenCalledWith(['+33600000000']);
		});
	});

	describe('searchByUsername', () => {
		it('wraps the matched user in a { user } envelope', async () => {
			const user = { id: 'u1' } as User;
			service.searchByUsername.mockResolvedValue(user);

			const result = await controller.searchByUsername({ username: 'alice' });

			expect(result).toEqual({ user });
			expect(service.searchByUsername).toHaveBeenCalledWith('alice');
		});

		it('returns { user: null } when no user matches', async () => {
			service.searchByUsername.mockResolvedValue(null);

			const result = await controller.searchByUsername({ username: 'alice' });

			expect(result).toEqual({ user: null });
		});
	});

	describe('searchByName', () => {
		it('delegates to the service with the provided limit', async () => {
			const results: UserSearchResult[] = [
				{ userId: 'u1', username: 'alice', firstName: 'Alice', lastName: null },
			];
			service.searchByDisplayName.mockResolvedValue(results);

			const result = await controller.searchByName({ query: 'alice', limit: 5 });

			expect(result).toBe(results);
			expect(service.searchByDisplayName).toHaveBeenCalledWith('alice', 5);
		});

		it('omits the limit when not provided', async () => {
			service.searchByDisplayName.mockResolvedValue([]);

			await controller.searchByName({ query: 'alice' });

			expect(service.searchByDisplayName).toHaveBeenCalledWith('alice', undefined);
		});
	});
});
