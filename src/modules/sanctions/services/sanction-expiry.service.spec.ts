import { Test, TestingModule } from '@nestjs/testing';
import { SanctionExpiryService } from './sanction-expiry.service';
import { SanctionsService } from './sanctions.service';

describe('SanctionExpiryService', () => {
	let expiryService: SanctionExpiryService;
	let sanctionsService: jest.Mocked<SanctionsService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SanctionExpiryService,
				{
					provide: SanctionsService,
					useValue: {
						expireSanctions: jest.fn(),
					},
				},
			],
		}).compile();

		expiryService = module.get(SanctionExpiryService);
		sanctionsService = module.get(SanctionsService);
	});

	describe('handleExpiry', () => {
		it('should call expireSanctions on the sanctions service', async () => {
			sanctionsService.expireSanctions.mockResolvedValue(3);

			await expiryService.handleExpiry();

			expect(sanctionsService.expireSanctions).toHaveBeenCalled();
		});

		it('should handle zero expired sanctions gracefully', async () => {
			sanctionsService.expireSanctions.mockResolvedValue(0);

			await expect(expiryService.handleExpiry()).resolves.toBeUndefined();
		});

		it('should not throw when expireSanctions fails', async () => {
			sanctionsService.expireSanctions.mockRejectedValue(new Error('DB connection lost'));

			await expect(expiryService.handleExpiry()).resolves.toBeUndefined();
		});

		it('should log the number of expired sanctions', async () => {
			const logSpy = jest.spyOn((expiryService as any).logger, 'log');
			sanctionsService.expireSanctions.mockResolvedValue(5);

			await expiryService.handleExpiry();

			expect(logSpy).toHaveBeenCalledWith('Expired 5 sanction(s)');
		});

		it('should log error when expireSanctions throws', async () => {
			const errorSpy = jest.spyOn((expiryService as any).logger, 'error');
			sanctionsService.expireSanctions.mockRejectedValue(new Error('DB error'));

			await expiryService.handleExpiry();

			expect(errorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Sanction expiry check failed'),
				expect.any(String)
			);
		});
	});
});
