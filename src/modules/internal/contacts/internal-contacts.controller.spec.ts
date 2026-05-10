import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalContactsController } from './internal-contacts.controller';
import { InternalContactsService } from './internal-contacts.service';
import { CheckContactQueryDto } from './dto/check-contact-query.dto';

describe('InternalContactsController', () => {
	let controller: InternalContactsController;
	let service: jest.Mocked<InternalContactsService>;

	const OWNER_ID = 'a0000000-0000-4000-a000-000000000001';
	const CONTACT_ID = 'b0000000-0000-4000-b000-000000000002';

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [InternalContactsController],
			providers: [
				{
					provide: InternalContactsService,
					useValue: { checkContactRelation: jest.fn() },
				},
				{
					provide: ConfigService,
					useValue: { get: jest.fn().mockReturnValue('test-token') },
				},
			],
		}).compile();

		controller = module.get(InternalContactsController);
		service = module.get(InternalContactsService);
	});

	describe('check', () => {
		it('delegates to the service and returns the response payload', async () => {
			service.checkContactRelation.mockResolvedValue({ isContact: true, isBlocked: false });
			const query: CheckContactQueryDto = { ownerId: OWNER_ID, contactId: CONTACT_ID };

			const result = await controller.check(query);

			expect(service.checkContactRelation).toHaveBeenCalledWith(OWNER_ID, CONTACT_ID);
			expect(result).toEqual({ isContact: true, isBlocked: false });
		});
	});
});
