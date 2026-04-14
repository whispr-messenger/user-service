import { Test, TestingModule } from '@nestjs/testing';
import { ReputationService } from './reputation.service';
import { ReputationRepository } from '../repositories/reputation.repository';
import { UserReputation } from '../entities/user-reputation.entity';

describe('ReputationService', () => {
	let service: ReputationService;
	let repo: jest.Mocked<ReputationRepository>;

	const mockReputation = (overrides: Partial<UserReputation> = {}): UserReputation => ({
		id: 'rep-1',
		userId: 'user-1',
		user: {} as any,
		score: 100,
		totalReportsReceived: 0,
		totalReportsFiled: 0,
		totalSanctions: 0,
		totalAppeals: 0,
		appealsAccepted: 0,
		lastSanctionAt: null,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		...overrides,
	});

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ReputationService,
				{
					provide: ReputationRepository,
					useValue: {
						findByUserId: jest.fn(),
						create: jest.fn(),
						save: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get(ReputationService);
		repo = module.get(ReputationRepository);
	});

	describe('getReputation', () => {
		it('should return existing reputation', async () => {
			const rep = mockReputation();
			repo.findByUserId.mockResolvedValue(rep);

			const result = await service.getReputation('user-1');

			expect(result).toEqual(rep);
			expect(repo.findByUserId).toHaveBeenCalledWith('user-1');
			expect(repo.create).not.toHaveBeenCalled();
		});

		it('should create reputation with defaults when none exists', async () => {
			repo.findByUserId.mockResolvedValue(null);
			const created = mockReputation();
			repo.create.mockResolvedValue(created);

			const result = await service.getReputation('user-1');

			expect(result).toEqual(created);
			expect(repo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-1',
					score: 100,
					totalReportsReceived: 0,
					totalSanctions: 0,
				})
			);
		});
	});

	describe('updateOnReportReceived', () => {
		it('should decrease score by 5 and increment totalReportsReceived', async () => {
			const rep = mockReputation({ score: 80, totalReportsReceived: 2 });
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.updateOnReportReceived('user-1');

			expect(result.score).toBe(75);
			expect(result.totalReportsReceived).toBe(3);
		});

		it('should clamp score at 0', async () => {
			const rep = mockReputation({ score: 3, totalReportsReceived: 10 });
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.updateOnReportReceived('user-1');

			expect(result.score).toBe(0);
		});
	});

	describe('updateOnSanctionApplied', () => {
		it('should decrease score by 10 for warning', async () => {
			const rep = mockReputation({ score: 100 });
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.updateOnSanctionApplied('user-1', 'warning');

			expect(result.score).toBe(90);
			expect(result.totalSanctions).toBe(1);
			expect(result.lastSanctionAt).toBeInstanceOf(Date);
		});

		it('should decrease score by 25 for temp_ban', async () => {
			const rep = mockReputation({ score: 100 });
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.updateOnSanctionApplied('user-1', 'temp_ban');

			expect(result.score).toBe(75);
		});

		it('should decrease score by 50 for perm_ban', async () => {
			const rep = mockReputation({ score: 100 });
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.updateOnSanctionApplied('user-1', 'perm_ban');

			expect(result.score).toBe(50);
		});

		it('should clamp score at 0 for perm_ban on low score', async () => {
			const rep = mockReputation({ score: 30 });
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.updateOnSanctionApplied('user-1', 'perm_ban');

			expect(result.score).toBe(0);
		});
	});

	describe('updateOnAppealAccepted', () => {
		it('should increase score by 15 and increment appeals counters', async () => {
			const rep = mockReputation({ score: 60, totalAppeals: 1, appealsAccepted: 0 });
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.updateOnAppealAccepted('user-1');

			expect(result.score).toBe(75);
			expect(result.totalAppeals).toBe(2);
			expect(result.appealsAccepted).toBe(1);
		});

		it('should clamp score at 100', async () => {
			const rep = mockReputation({ score: 95 });
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.updateOnAppealAccepted('user-1');

			expect(result.score).toBe(100);
		});
	});

	describe('updateOnAppealRejected', () => {
		it('should decrease score by 5 and increment totalAppeals', async () => {
			const rep = mockReputation({ score: 60, totalAppeals: 1 });
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.updateOnAppealRejected('user-1');

			expect(result.score).toBe(55);
			expect(result.totalAppeals).toBe(2);
		});
	});

	describe('updateOnReportFiled', () => {
		it('should increment totalReportsFiled without changing score', async () => {
			const rep = mockReputation({ score: 80, totalReportsFiled: 3 });
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.updateOnReportFiled('user-1');

			expect(result.score).toBe(80);
			expect(result.totalReportsFiled).toBe(4);
		});
	});

	describe('recalculateScore', () => {
		it('should recompute score from history fields', async () => {
			const rep = mockReputation({
				score: 10,
				totalReportsReceived: 2,
				totalSanctions: 1,
				appealsAccepted: 1,
			});
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.recalculateScore('user-1');

			// 100 - (2*5) - (1*15) + (1*15) = 90
			expect(result.score).toBe(90);
		});

		it('should clamp recalculated score at 0', async () => {
			const rep = mockReputation({
				score: 50,
				totalReportsReceived: 10,
				totalSanctions: 5,
				appealsAccepted: 0,
			});
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.recalculateScore('user-1');

			// 100 - (10*5) - (5*15) = 100 - 50 - 75 = -25 -> 0
			expect(result.score).toBe(0);
		});

		it('should clamp recalculated score at 100', async () => {
			const rep = mockReputation({
				score: 50,
				totalReportsReceived: 0,
				totalSanctions: 0,
				appealsAccepted: 2,
			});
			repo.findByUserId.mockResolvedValue(rep);
			repo.save.mockImplementation(async (r) => r);

			const result = await service.recalculateScore('user-1');

			// 100 - 0 - 0 + (2*15) = 130 -> 100
			expect(result.score).toBe(100);
		});
	});
});
