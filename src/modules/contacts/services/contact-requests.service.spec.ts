import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import {
	NotFoundException,
	ConflictException,
	BadRequestException,
	ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ContactRequestsService } from './contact-requests.service';
import { ContactsNotificationPublisher } from './contacts-notification-publisher.service';
import { UserRepository } from '../../common/repositories';
import { ContactRequestsRepository } from '../repositories/contact-requests.repository';
import { ContactsRepository } from '../repositories/contacts.repository';
import { ContactRequest, ContactRequestStatus } from '../entities/contact-request.entity';
import { Contact } from '../entities/contact.entity';
import { User } from '../../common/entities/user.entity';

const mockUser = (id: string): User => ({ id }) as User;

const mockRequest = (overrides: Partial<ContactRequest> = {}): ContactRequest =>
	({
		id: 'req-1',
		requesterId: 'uuid-a',
		recipientId: 'uuid-b',
		status: ContactRequestStatus.PENDING,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-01'),
		...overrides,
	}) as ContactRequest;

describe('ContactRequestsService', () => {
	let service: ContactRequestsService;
	let userRepository: jest.Mocked<UserRepository>;
	let contactRequestsRepository: jest.Mocked<ContactRequestsRepository>;
	let contactsRepository: jest.Mocked<ContactsRepository>;
	let transactionalContactRepo: {
		findOne: jest.Mock;
		create: jest.Mock;
		save: jest.Mock;
	};
	let transactionalRequestRepo: {
		save: jest.Mock;
	};
	let commitTransaction: jest.Mock;
	let rollbackTransaction: jest.Mock;
	let release: jest.Mock;

	beforeEach(async () => {
		transactionalContactRepo = {
			findOne: jest.fn(),
			create: jest.fn((entity: Partial<Contact>) => entity as Contact),
			save: jest.fn(async (entity: Partial<Contact>) => entity as Contact),
		};
		transactionalRequestRepo = {
			save: jest.fn(async (entity: ContactRequest) => entity),
		};
		commitTransaction = jest.fn();
		rollbackTransaction = jest.fn();
		release = jest.fn();

		const queryRunner = {
			connect: jest.fn(),
			startTransaction: jest.fn(),
			commitTransaction,
			rollbackTransaction,
			release,
			manager: {
				getRepository: jest.fn((entity) => {
					if (entity === Contact) return transactionalContactRepo;
					if (entity === ContactRequest) return transactionalRequestRepo;
					throw new Error(`Unexpected entity in test: ${String(entity)}`);
				}),
			},
		};

		const dataSource = {
			createQueryRunner: jest.fn(() => queryRunner),
		} as unknown as DataSource;

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ContactRequestsService,
				{
					provide: UserRepository,
					useValue: { findById: jest.fn() },
				},
				{
					provide: ContactRequestsRepository,
					useValue: {
						findById: jest.fn(),
						findPendingBetween: jest.fn(),
						findAllForUserPaginated: jest.fn(),
						create: jest.fn(),
						save: jest.fn(),
						remove: jest.fn(),
					},
				},
				{
					provide: ContactsRepository,
					useValue: { findOne: jest.fn() },
				},
				{
					provide: getDataSourceToken(),
					useValue: dataSource,
				},
				{
					provide: ContactsNotificationPublisher,
					useValue: {
						publishRequestReceived: jest.fn().mockResolvedValue(undefined),
						publishRequestAccepted: jest.fn().mockResolvedValue(undefined),
					},
				},
			],
		}).compile();

		service = module.get<ContactRequestsService>(ContactRequestsService);
		userRepository = module.get(UserRepository);
		contactRequestsRepository = module.get(ContactRequestsRepository);
		contactsRepository = module.get(ContactsRepository);
	});

	describe('sendRequest', () => {
		it('throws BadRequest when requester equals recipient', async () => {
			await expect(service.sendRequest('uuid-a', 'uuid-a')).rejects.toThrow(BadRequestException);
			expect(userRepository.findById).not.toHaveBeenCalled();
		});

		it('throws NotFound when requester does not exist', async () => {
			userRepository.findById.mockResolvedValueOnce(null);
			await expect(service.sendRequest('uuid-a', 'uuid-b')).rejects.toThrow(NotFoundException);
		});

		it('throws NotFound when recipient does not exist', async () => {
			userRepository.findById.mockResolvedValueOnce(mockUser('uuid-a')).mockResolvedValueOnce(null);
			await expect(service.sendRequest('uuid-a', 'uuid-b')).rejects.toThrow(NotFoundException);
		});

		it('throws Conflict when users are already contacts', async () => {
			userRepository.findById.mockResolvedValue(mockUser('uuid-a'));
			contactsRepository.findOne.mockResolvedValue({ id: 'c-1' } as Contact);

			await expect(service.sendRequest('uuid-a', 'uuid-b')).rejects.toThrow(ConflictException);
		});

		it('throws Conflict when a pending request exists in either direction', async () => {
			userRepository.findById.mockResolvedValue(mockUser('uuid-a'));
			contactsRepository.findOne.mockResolvedValue(null);
			contactRequestsRepository.findPendingBetween.mockResolvedValue(mockRequest());

			await expect(service.sendRequest('uuid-a', 'uuid-b')).rejects.toThrow(ConflictException);
			expect(contactRequestsRepository.findPendingBetween).toHaveBeenCalledWith('uuid-a', 'uuid-b');
		});

		it('creates a new pending request when inputs are valid', async () => {
			const created = mockRequest();
			userRepository.findById.mockResolvedValue(mockUser('uuid-a'));
			contactsRepository.findOne.mockResolvedValue(null);
			contactRequestsRepository.findPendingBetween.mockResolvedValue(null);
			contactRequestsRepository.create.mockResolvedValue(created);

			const result = await service.sendRequest('uuid-a', 'uuid-b');

			expect(result).toBe(created);
			expect(contactRequestsRepository.create).toHaveBeenCalledWith('uuid-a', 'uuid-b');
		});
	});

	describe('getRequestsForUser', () => {
		it('throws NotFound when user does not exist', async () => {
			userRepository.findById.mockResolvedValue(null);
			await expect(service.getRequestsForUser('uuid-a')).rejects.toThrow(NotFoundException);
		});

		it('delegates to repository when user exists', async () => {
			const requests = [mockRequest()];
			const paginated = { data: requests, nextCursor: null, hasMore: false };
			userRepository.findById.mockResolvedValue(mockUser('uuid-a'));
			contactRequestsRepository.findAllForUserPaginated.mockResolvedValue(paginated);

			const result = await service.getRequestsForUser('uuid-a');

			expect(result).toEqual(paginated);
			expect(contactRequestsRepository.findAllForUserPaginated).toHaveBeenCalledWith(
				'uuid-a',
				50,
				undefined
			);
		});

		it('passes limit and cursor to repository', async () => {
			const paginated = { data: [], nextCursor: null, hasMore: false };
			userRepository.findById.mockResolvedValue(mockUser('uuid-a'));
			contactRequestsRepository.findAllForUserPaginated.mockResolvedValue(paginated);

			await service.getRequestsForUser('uuid-a', 10, 'some-cursor');

			expect(contactRequestsRepository.findAllForUserPaginated).toHaveBeenCalledWith(
				'uuid-a',
				10,
				'some-cursor'
			);
		});
	});

	describe('acceptRequest', () => {
		it('throws NotFound when request does not exist', async () => {
			contactRequestsRepository.findById.mockResolvedValue(null);
			await expect(service.acceptRequest('req-1', 'uuid-b')).rejects.toThrow(NotFoundException);
		});

		it('throws Forbidden when the caller is not the recipient', async () => {
			contactRequestsRepository.findById.mockResolvedValue(mockRequest());
			await expect(service.acceptRequest('req-1', 'uuid-a')).rejects.toThrow(ForbiddenException);
		});

		it('throws Conflict when the request is not pending', async () => {
			contactRequestsRepository.findById.mockResolvedValue(
				mockRequest({ status: ContactRequestStatus.ACCEPTED })
			);
			await expect(service.acceptRequest('req-1', 'uuid-b')).rejects.toThrow(ConflictException);
		});

		it('creates bidirectional contacts and updates status in a transaction', async () => {
			const request = mockRequest();
			contactRequestsRepository.findById.mockResolvedValue(request);
			transactionalContactRepo.findOne.mockResolvedValue(null);

			const result = await service.acceptRequest('req-1', 'uuid-b');

			expect(transactionalContactRepo.save).toHaveBeenCalledTimes(2);
			expect(transactionalContactRepo.save).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ ownerId: 'uuid-a', contactId: 'uuid-b' })
			);
			expect(transactionalContactRepo.save).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ ownerId: 'uuid-b', contactId: 'uuid-a' })
			);
			expect(transactionalRequestRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'req-1', status: ContactRequestStatus.ACCEPTED })
			);
			expect(commitTransaction).toHaveBeenCalled();
			expect(rollbackTransaction).not.toHaveBeenCalled();
			expect(release).toHaveBeenCalled();
			expect(result.status).toBe(ContactRequestStatus.ACCEPTED);
		});

		it('skips creation of an existing contact row', async () => {
			contactRequestsRepository.findById.mockResolvedValue(mockRequest());
			transactionalContactRepo.findOne
				.mockResolvedValueOnce({ id: 'c-ab' } as Contact)
				.mockResolvedValueOnce(null);

			await service.acceptRequest('req-1', 'uuid-b');

			expect(transactionalContactRepo.save).toHaveBeenCalledTimes(1);
			expect(transactionalContactRepo.save).toHaveBeenCalledWith(
				expect.objectContaining({ ownerId: 'uuid-b', contactId: 'uuid-a' })
			);
		});

		it('rolls back the transaction on failure', async () => {
			contactRequestsRepository.findById.mockResolvedValue(mockRequest());
			transactionalContactRepo.findOne.mockResolvedValue(null);
			transactionalContactRepo.save.mockRejectedValueOnce(new Error('DB boom'));

			await expect(service.acceptRequest('req-1', 'uuid-b')).rejects.toThrow('DB boom');
			expect(commitTransaction).not.toHaveBeenCalled();
			expect(rollbackTransaction).toHaveBeenCalled();
			expect(release).toHaveBeenCalled();
		});
	});

	describe('rejectRequest', () => {
		it('throws NotFound when request does not exist', async () => {
			contactRequestsRepository.findById.mockResolvedValue(null);
			await expect(service.rejectRequest('req-1', 'uuid-b')).rejects.toThrow(NotFoundException);
		});

		it('throws Forbidden when the caller is not the recipient', async () => {
			contactRequestsRepository.findById.mockResolvedValue(mockRequest());
			await expect(service.rejectRequest('req-1', 'uuid-a')).rejects.toThrow(ForbiddenException);
		});

		it('throws Conflict when the request is not pending', async () => {
			contactRequestsRepository.findById.mockResolvedValue(
				mockRequest({ status: ContactRequestStatus.REJECTED })
			);
			await expect(service.rejectRequest('req-1', 'uuid-b')).rejects.toThrow(ConflictException);
		});

		it('updates status to rejected', async () => {
			const request = mockRequest();
			contactRequestsRepository.findById.mockResolvedValue(request);
			contactRequestsRepository.save.mockImplementation(async (r) => r);

			const result = await service.rejectRequest('req-1', 'uuid-b');

			expect(result.status).toBe(ContactRequestStatus.REJECTED);
			expect(contactRequestsRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'req-1', status: ContactRequestStatus.REJECTED })
			);
		});
	});

	describe('cancelRequest', () => {
		it('throws NotFound when request does not exist', async () => {
			contactRequestsRepository.findById.mockResolvedValue(null);
			await expect(service.cancelRequest('req-1', 'uuid-a')).rejects.toThrow(NotFoundException);
		});

		it('throws Forbidden when the caller is not the requester', async () => {
			contactRequestsRepository.findById.mockResolvedValue(mockRequest());
			await expect(service.cancelRequest('req-1', 'uuid-b')).rejects.toThrow(ForbiddenException);
		});

		it('throws Conflict when the request is not pending', async () => {
			contactRequestsRepository.findById.mockResolvedValue(
				mockRequest({ status: ContactRequestStatus.ACCEPTED })
			);
			await expect(service.cancelRequest('req-1', 'uuid-a')).rejects.toThrow(ConflictException);
		});

		it('removes the request when valid', async () => {
			const request = mockRequest();
			contactRequestsRepository.findById.mockResolvedValue(request);

			await service.cancelRequest('req-1', 'uuid-a');

			expect(contactRequestsRepository.remove).toHaveBeenCalledWith(request);
		});
	});
});
