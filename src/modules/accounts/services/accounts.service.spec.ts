import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { UserRepository } from '../../common/repositories';
import { User } from '../../common/entities/user.entity';
import { SearchIndexService } from '../../cache/search-index.service';

const mockUser = (): User =>
	({
		id: 'uuid-1',
		phoneNumber: '+33600000001',
		username: null,
		firstName: null,
		lastName: null,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	}) as User;

describe('AccountsService', () => {
	let service: AccountsService;
	let userRepository: jest.Mocked<UserRepository>;
	let eventsClient: { emit: jest.Mock };
	let searchIndexService: { indexUser: jest.Mock };

	beforeEach(async () => {
		eventsClient = { emit: jest.fn() };
		searchIndexService = { indexUser: jest.fn() };

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AccountsService,
				{
					provide: UserRepository,
					useValue: {
						findById: jest.fn(),
						findByPhoneNumber: jest.fn(),
						create: jest.fn(),
						updateLastSeen: jest.fn(),
						updateStatus: jest.fn(),
						softDelete: jest.fn(),
					},
				},
				{
					provide: 'EVENTS_SERVICE',
					useValue: eventsClient,
				},
				{
					provide: SearchIndexService,
					useValue: searchIndexService,
				},
			],
		}).compile();

		service = module.get<AccountsService>(AccountsService);
		userRepository = module.get(UserRepository);
	});

	describe('createFromEvent', () => {
		const event = { userId: 'uuid-1', phoneNumber: '+33600000001', registeredAt: new Date() };

		it('returns existing user if already present', async () => {
			const existing = mockUser();
			userRepository.findById.mockResolvedValue(existing);

			const result = await service.createFromEvent(event);

			expect(result).toBe(existing);
			expect(userRepository.create).not.toHaveBeenCalled();
		});

		it('throws ConflictException if phone number belongs to another user', async () => {
			userRepository.findById.mockResolvedValue(null);
			userRepository.findByPhoneNumber.mockResolvedValue({ ...mockUser(), id: 'other-uuid' } as User);

			await expect(service.createFromEvent(event)).rejects.toThrow(ConflictException);
		});

		it('creates and returns a new user', async () => {
			const created = mockUser();
			userRepository.findById.mockResolvedValue(null);
			userRepository.findByPhoneNumber.mockResolvedValue(null);
			userRepository.create.mockResolvedValue(created);

			const result = await service.createFromEvent(event);

			expect(userRepository.create).toHaveBeenCalledWith({
				id: event.userId,
				phoneNumber: event.phoneNumber,
				isActive: true,
			});
			expect(result).toBe(created);
		});

		it('emits user.created event after creation', async () => {
			const created = mockUser();
			userRepository.findById.mockResolvedValue(null);
			userRepository.findByPhoneNumber.mockResolvedValue(null);
			userRepository.create.mockResolvedValue(created);

			await service.createFromEvent(event);

			expect(eventsClient.emit).toHaveBeenCalledWith(
				'user.created',
				expect.objectContaining({ userId: created.id })
			);
		});
	});

	describe('updateLastSeen', () => {
		it('delegates to repository', async () => {
			userRepository.updateLastSeen.mockResolvedValue(undefined);

			await service.updateLastSeen('uuid-1');

			expect(userRepository.updateLastSeen).toHaveBeenCalledWith('uuid-1');
		});
	});

	describe('deactivate', () => {
		it('deactivates an existing user', async () => {
			userRepository.findById.mockResolvedValue(mockUser());
			userRepository.updateStatus.mockResolvedValue(undefined);

			await service.deactivate('uuid-1');

			expect(userRepository.updateStatus).toHaveBeenCalledWith('uuid-1', false);
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.deactivate('uuid-1')).rejects.toThrow(NotFoundException);
		});
	});

	describe('activate', () => {
		it('activates an existing user', async () => {
			userRepository.findById.mockResolvedValue(mockUser());
			userRepository.updateStatus.mockResolvedValue(undefined);

			await service.activate('uuid-1');

			expect(userRepository.updateStatus).toHaveBeenCalledWith('uuid-1', true);
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.activate('uuid-1')).rejects.toThrow(NotFoundException);
		});
	});

	describe('remove', () => {
		it('soft-deletes an existing user', async () => {
			userRepository.findById.mockResolvedValue(mockUser());
			userRepository.softDelete.mockResolvedValue(undefined);

			await service.remove('uuid-1');

			expect(userRepository.softDelete).toHaveBeenCalledWith('uuid-1');
		});

		it('throws NotFoundException when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);

			await expect(service.remove('uuid-1')).rejects.toThrow(NotFoundException);
		});
	});
});
