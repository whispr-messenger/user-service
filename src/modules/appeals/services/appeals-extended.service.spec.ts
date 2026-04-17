import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { AppealsRepository } from '../repositories/appeals.repository';
import { RolesService } from '../../roles/services/roles.service';
import { SanctionsService } from '../../sanctions/services/sanctions.service';
import { RedisConfig } from '../../../config/redis.config';
import { Appeal } from '../entities/appeal.entity';

describe('AppealsService — extended features', () => {
	let service: AppealsService;
	let appealsRepository: jest.Mocked<AppealsRepository>;
	let rolesService: jest.Mocked<RolesService>;

	const mockAppeal = (overrides: Partial<Appeal> = {}): Appeal => ({
		id: 'appeal-1',
		userId: 'user-1',
		user: {} as any,
		sanctionId: 'sanction-1',
		sanction: {} as any,
		type: 'sanction',
		reason: 'I disagree',
		evidence: {},
		status: 'pending',
		reviewerId: null,
		reviewerNotes: null,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-02'),
		resolvedAt: null,
		...overrides,
	});

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AppealsService,
				{
					provide: AppealsRepository,
					useValue: {
						create: jest.fn(),
						findById: jest.fn(),
						findByUserId: jest.fn(),
						findPendingQueue: jest.fn(),
						update: jest.fn(),
						findFiltered: jest.fn(),
						getStatsByStatus: jest.fn(),
						getTimeline: jest.fn(),
					},
				},
				{
					provide: RolesService,
					useValue: {
						ensureAdminOrModerator: jest.fn(),
					},
				},
				{
					provide: SanctionsService,
					useValue: {
						getSanction: jest.fn(),
						liftSanction: jest.fn(),
					},
				},
				{
					provide: RedisConfig,
					useValue: {
						getClient: jest.fn().mockReturnValue({
							publish: jest.fn().mockResolvedValue(1),
						}),
					},
				},
			],
		}).compile();

		service = module.get(AppealsService);
		appealsRepository = module.get(AppealsRepository);
		rolesService = module.get(RolesService);
	});

	describe('findFiltered', () => {
		it('should pass parsed filters to repository', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const appeals = [mockAppeal()];
			appealsRepository.findFiltered.mockResolvedValue(appeals);

			const result = await service.findFiltered('admin-1', {
				status: 'pending',
				userId: 'user-1',
				sanctionId: 'sanction-1',
				dateFrom: '2026-01-01',
				dateTo: '2026-12-31',
				limit: '20',
				offset: '10',
			});

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(appealsRepository.findFiltered).toHaveBeenCalledWith({
				status: 'pending',
				userId: 'user-1',
				sanctionId: 'sanction-1',
				dateFrom: new Date('2026-01-01'),
				dateTo: new Date('2026-12-31'),
				limit: 20,
				offset: 10,
			});
			expect(result).toEqual(appeals);
		});

		it('should use default limit and offset', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			appealsRepository.findFiltered.mockResolvedValue([]);

			await service.findFiltered('admin-1', {});

			expect(appealsRepository.findFiltered).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 50, offset: 0 })
			);
		});

		it('should throw ForbiddenException for non-admin', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(service.findFiltered('user-1', {})).rejects.toThrow(ForbiddenException);
		});
	});

	describe('getStats', () => {
		it('should return appeal stats by status', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const stats = [
				{ status: 'pending', count: 10 },
				{ status: 'accepted', count: 5 },
				{ status: 'rejected', count: 3 },
			];
			appealsRepository.getStatsByStatus.mockResolvedValue(stats);

			const result = await service.getStats('admin-1');

			expect(result).toEqual(stats);
		});

		it('should throw ForbiddenException for non-admin', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(service.getStats('user-1')).rejects.toThrow(ForbiddenException);
		});
	});

	describe('getTimeline', () => {
		it('should return appeal with timeline events for pending appeal', async () => {
			const appeal = mockAppeal({ status: 'pending', resolvedAt: null });
			appealsRepository.getTimeline.mockResolvedValue(appeal);

			const result = await service.getTimeline('appeal-1');

			expect(result.appeal).toEqual(appeal);
			expect(result.events).toHaveLength(1);
			expect(result.events[0].event).toBe('appeal_created');
		});

		it('should include under_review and resolved events for accepted appeal', async () => {
			const appeal = mockAppeal({
				status: 'accepted',
				resolvedAt: new Date('2026-01-05'),
				reviewerNotes: 'Approved',
			});
			appealsRepository.getTimeline.mockResolvedValue(appeal);

			const result = await service.getTimeline('appeal-1');

			expect(result.events).toHaveLength(3);
			expect(result.events[0].event).toBe('appeal_created');
			expect(result.events[1].event).toBe('under_review');
			expect(result.events[2].event).toBe('appeal_accepted');
			expect(result.events[2].details).toBe('Approved');
		});

		it('should include rejected event with notes', async () => {
			const appeal = mockAppeal({
				status: 'rejected',
				resolvedAt: new Date('2026-01-05'),
				reviewerNotes: 'Insufficient evidence',
			});
			appealsRepository.getTimeline.mockResolvedValue(appeal);

			const result = await service.getTimeline('appeal-1');

			expect(result.events[2].event).toBe('appeal_rejected');
			expect(result.events[2].details).toBe('Insufficient evidence');
		});

		it('should throw NotFoundException when appeal does not exist', async () => {
			appealsRepository.getTimeline.mockResolvedValue(null);

			await expect(service.getTimeline('unknown')).rejects.toThrow(NotFoundException);
		});

		it('should handle resolved appeal without reviewer notes', async () => {
			const appeal = mockAppeal({
				status: 'accepted',
				resolvedAt: new Date('2026-01-05'),
				reviewerNotes: null,
			});
			appealsRepository.getTimeline.mockResolvedValue(appeal);

			const result = await service.getTimeline('appeal-1');

			expect(result.events[2].details).toBeUndefined();
		});
	});
});
