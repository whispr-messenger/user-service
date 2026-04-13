import { Test, TestingModule } from '@nestjs/testing';
import type { Request as ExpressRequest } from 'express';
import { ContactRequestsController } from './contact-requests.controller';
import { ContactRequestsService } from '../services/contact-requests.service';
import { ContactRequest, ContactRequestStatus } from '../entities/contact-request.entity';
import { SendContactRequestDto } from '../dto/send-contact-request.dto';
import { JwtPayload } from '../../jwt-auth/jwt.strategy';

const mockRequest = (): ContactRequest =>
	({
		id: 'req-1',
		requesterId: 'uuid-a',
		recipientId: 'uuid-b',
		status: ContactRequestStatus.PENDING,
	}) as ContactRequest;

const makeReq = (sub: string): ExpressRequest & { user: JwtPayload } =>
	({ user: { sub } as JwtPayload }) as ExpressRequest & { user: JwtPayload };

describe('ContactRequestsController', () => {
	let controller: ContactRequestsController;
	let service: jest.Mocked<ContactRequestsService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [ContactRequestsController],
			providers: [
				{
					provide: ContactRequestsService,
					useValue: {
						sendRequest: jest.fn(),
						getRequestsForUser: jest.fn(),
						acceptRequest: jest.fn(),
						rejectRequest: jest.fn(),
						cancelRequest: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<ContactRequestsController>(ContactRequestsController);
		service = module.get(ContactRequestsService);
	});

	describe('sendRequest', () => {
		it('uses the authenticated user as the requester', async () => {
			const created = mockRequest();
			service.sendRequest.mockResolvedValue(created);
			const dto: SendContactRequestDto = { contactId: 'uuid-b' };

			const result = await controller.sendRequest(makeReq('uuid-a'), dto);

			expect(result).toBe(created);
			expect(service.sendRequest).toHaveBeenCalledWith('uuid-a', 'uuid-b');
		});
	});

	describe('getRequests', () => {
		it('returns paginated requests for the authenticated user', async () => {
			const paginated = { data: [mockRequest()], nextCursor: null, hasMore: false };
			service.getRequestsForUser.mockResolvedValue(paginated);

			const result = await controller.getRequests({}, makeReq('uuid-a'));

			expect(result).toEqual(paginated);
			expect(service.getRequestsForUser).toHaveBeenCalledWith('uuid-a', undefined, undefined);
		});
	});

	describe('acceptRequest', () => {
		it('delegates to the service with the caller user id', async () => {
			const accepted = { ...mockRequest(), status: ContactRequestStatus.ACCEPTED } as ContactRequest;
			service.acceptRequest.mockResolvedValue(accepted);

			const result = await controller.acceptRequest(makeReq('uuid-b'), 'req-1');

			expect(result).toBe(accepted);
			expect(service.acceptRequest).toHaveBeenCalledWith('req-1', 'uuid-b');
		});
	});

	describe('rejectRequest', () => {
		it('delegates to the service with the caller user id', async () => {
			const rejected = { ...mockRequest(), status: ContactRequestStatus.REJECTED } as ContactRequest;
			service.rejectRequest.mockResolvedValue(rejected);

			const result = await controller.rejectRequest(makeReq('uuid-b'), 'req-1');

			expect(result).toBe(rejected);
			expect(service.rejectRequest).toHaveBeenCalledWith('req-1', 'uuid-b');
		});
	});

	describe('cancelRequest', () => {
		it('delegates to the service with the caller user id', async () => {
			service.cancelRequest.mockResolvedValue(undefined);

			await controller.cancelRequest(makeReq('uuid-a'), 'req-1');

			expect(service.cancelRequest).toHaveBeenCalledWith('req-1', 'uuid-a');
		});
	});
});
