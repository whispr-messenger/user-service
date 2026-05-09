import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalPrivacyController } from './internal-privacy.controller';
import { InternalPrivacyService } from './internal-privacy.service';
import { PrivacyLevel } from '../../privacy/entities/privacy-settings.entity';

describe('InternalPrivacyController', () => {
	let controller: InternalPrivacyController;
	let service: jest.Mocked<InternalPrivacyService>;

	const USER_ID = 'a0000000-0000-4000-a000-000000000001';

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [InternalPrivacyController],
			providers: [
				{
					provide: InternalPrivacyService,
					useValue: { getPrivacyForInternal: jest.fn() },
				},
				{
					provide: ConfigService,
					useValue: { get: jest.fn().mockReturnValue('test-token') },
				},
			],
		}).compile();

		controller = module.get(InternalPrivacyController);
		service = module.get(InternalPrivacyService);
	});

	describe('getPrivacy', () => {
		it('delegates to the service and returns the response payload', async () => {
			service.getPrivacyForInternal.mockResolvedValue({
				userId: USER_ID,
				readReceipts: true,
				lastSeenPrivacy: PrivacyLevel.CONTACTS,
				onlineStatus: PrivacyLevel.EVERYONE,
			});

			const result = await controller.getPrivacy(USER_ID);

			expect(service.getPrivacyForInternal).toHaveBeenCalledWith(USER_ID);
			expect(result).toEqual({
				userId: USER_ID,
				readReceipts: true,
				lastSeenPrivacy: PrivacyLevel.CONTACTS,
				onlineStatus: PrivacyLevel.EVERYONE,
			});
		});
	});
});
