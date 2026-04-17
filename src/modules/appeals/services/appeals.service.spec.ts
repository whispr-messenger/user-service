import { Test, TestingModule } from '@nestjs/testing';
import {
	NotFoundException,
	ForbiddenException,
	ConflictException,
	BadRequestException,
} from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { AppealsRepository } from '../repositories/appeals.repository';
import { RolesService } from '../../roles/services/roles.service';
import { SanctionsService } from '../../sanctions/services/sanctions.service';
import { RedisConfig } from '../../../config/redis.config';
import { Appeal } from '../entities/appeal.entity';
import { UserSanction } from '../../sanctions/entities/user-sanction.entity';

describe('AppealsService', () => {
	let service: AppealsService;
	let appealsRepository: jest.Mocked<AppealsRepository>;
	let rolesService: jest.Mocked<RolesService>;
	let sanctionsService: jest.Mocked<SanctionsService>;
	let redisPublish: jest.Mock;

	const mockSanction = (overrides: Partial<UserSanction> = {}): UserSanction => ({
		id: 'sanction-1',
		userId: 'user-1',
		user: {} as any,
		type: 'temp_ban',
		reason: 'Spam',
		evidenceRef: {},
		issuedBy: 'admin-1',
		expiresAt: null,
		active: true,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		...overrides,
	});

	const mockAppeal = (overrides: Partial<Appeal> = {}): Appeal => ({
		id: 'appeal-1',
		userId: 'user-1',
		user: {} as any,
		sanctionId: 'sanction-1',
		sanction: {} as any,
		type: 'sanction',
		reason: 'I did not do it',
		evidence: {},
		status: 'pending',
		reviewerId: null,
		reviewerNotes: null,
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
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
							publish: (redisPublish = jest.fn().mockResolvedValue(1)),
						}),
					},
				},
			],
		}).compile();

		service = module.get(AppealsService);
		appealsRepository = module.get(AppealsRepository);
		rolesService = module.get(RolesService);
		sanctionsService = module.get(SanctionsService);
	});

	describe('createAppeal', () => {
		const dto = { sanctionId: 'sanction-1', reason: 'I did not do it' };

		it('should create an appeal for an active sanction', async () => {
			sanctionsService.getSanction.mockResolvedValue(mockSanction({ active: true }));
			appealsRepository.findByUserId.mockResolvedValue([]);
			const created = mockAppeal();
			appealsRepository.create.mockResolvedValue(created);

			const result = await service.createAppeal(dto, 'user-1');

			expect(sanctionsService.getSanction).toHaveBeenCalledWith('sanction-1');
			expect(appealsRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-1',
					sanctionId: 'sanction-1',
					reason: 'I did not do it',
					status: 'pending',
				})
			);
			expect(result).toEqual(created);
		});

		it('should throw ConflictException when sanction is no longer active', async () => {
			sanctionsService.getSanction.mockResolvedValue(mockSanction({ active: false }));

			await expect(service.createAppeal(dto, 'user-1')).rejects.toThrow(ConflictException);
		});

		it('should throw ConflictException when a pending appeal already exists for the sanction', async () => {
			sanctionsService.getSanction.mockResolvedValue(mockSanction({ active: true }));
			appealsRepository.findByUserId.mockResolvedValue([
				mockAppeal({ sanctionId: 'sanction-1', status: 'pending' }),
			]);

			await expect(service.createAppeal(dto, 'user-1')).rejects.toThrow(ConflictException);
		});

		it('should throw ConflictException when an under_review appeal exists for the sanction', async () => {
			sanctionsService.getSanction.mockResolvedValue(mockSanction({ active: true }));
			appealsRepository.findByUserId.mockResolvedValue([
				mockAppeal({ sanctionId: 'sanction-1', status: 'under_review' }),
			]);

			await expect(service.createAppeal(dto, 'user-1')).rejects.toThrow(ConflictException);
		});

		it('should allow appeal when previous appeal for same sanction was rejected', async () => {
			sanctionsService.getSanction.mockResolvedValue(mockSanction({ active: true }));
			appealsRepository.findByUserId.mockResolvedValue([
				mockAppeal({ sanctionId: 'sanction-1', status: 'rejected' }),
			]);
			appealsRepository.create.mockResolvedValue(mockAppeal());

			await expect(service.createAppeal(dto, 'user-1')).resolves.toBeDefined();
		});

		it('should throw BadRequestException when user has 3 active appeals', async () => {
			sanctionsService.getSanction.mockResolvedValue(mockSanction({ active: true }));
			appealsRepository.findByUserId.mockResolvedValue([
				mockAppeal({ id: 'a1', sanctionId: 'other-1', status: 'pending' }),
				mockAppeal({ id: 'a2', sanctionId: 'other-2', status: 'pending' }),
				mockAppeal({ id: 'a3', sanctionId: 'other-3', status: 'under_review' }),
			]);

			await expect(service.createAppeal(dto, 'user-1')).rejects.toThrow(BadRequestException);
		});
	});

	describe('getMyAppeals', () => {
		it('should return all appeals for the user', async () => {
			const appeals = [mockAppeal(), mockAppeal({ id: 'appeal-2' })];
			appealsRepository.findByUserId.mockResolvedValue(appeals);

			const result = await service.getMyAppeals('user-1');

			expect(result).toEqual(appeals);
			expect(appealsRepository.findByUserId).toHaveBeenCalledWith('user-1');
		});
	});

	describe('getAppealQueue', () => {
		it('should return pending appeals for admin/moderator', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const queue = [mockAppeal()];
			appealsRepository.findPendingQueue.mockResolvedValue(queue);

			const result = await service.getAppealQueue('admin-1', 20, 0);

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(appealsRepository.findPendingQueue).toHaveBeenCalledWith(20, 0);
			expect(result).toEqual(queue);
		});

		it('should throw ForbiddenException for regular user', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(service.getAppealQueue('user-1')).rejects.toThrow(ForbiddenException);
		});
	});

	describe('getAppeal', () => {
		it('should return the appeal when found', async () => {
			const appeal = mockAppeal();
			appealsRepository.findById.mockResolvedValue(appeal);

			const result = await service.getAppeal('appeal-1');

			expect(result).toEqual(appeal);
		});

		it('should throw NotFoundException when appeal does not exist', async () => {
			appealsRepository.findById.mockResolvedValue(null);

			await expect(service.getAppeal('unknown')).rejects.toThrow(NotFoundException);
		});
	});

	describe('reviewAppeal', () => {
		it('should accept an appeal and lift the sanction', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const appeal = mockAppeal({ status: 'pending' });
			appealsRepository.findById.mockResolvedValue(appeal);
			const updated = mockAppeal({ status: 'accepted', reviewerId: 'admin-1' });
			appealsRepository.update.mockResolvedValue(updated);
			sanctionsService.liftSanction.mockResolvedValue({} as any);

			const result = await service.reviewAppeal('appeal-1', 'admin-1', {
				status: 'accepted' as any,
				reviewerNotes: 'Approved',
			});

			expect(rolesService.ensureAdminOrModerator).toHaveBeenCalledWith('admin-1');
			expect(sanctionsService.liftSanction).toHaveBeenCalledWith('sanction-1', 'admin-1');
			expect(appealsRepository.update).toHaveBeenCalled();
			expect(result).toEqual(updated);
		});

		it('should reject an appeal without lifting the sanction', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const appeal = mockAppeal({ status: 'pending' });
			appealsRepository.findById.mockResolvedValue(appeal);
			const updated = mockAppeal({ status: 'rejected', reviewerId: 'admin-1' });
			appealsRepository.update.mockResolvedValue(updated);

			const result = await service.reviewAppeal('appeal-1', 'admin-1', {
				status: 'rejected' as any,
			});

			expect(sanctionsService.liftSanction).not.toHaveBeenCalled();
			expect(result).toEqual(updated);
		});

		it('should throw ForbiddenException when caller lacks role', async () => {
			rolesService.ensureAdminOrModerator.mockRejectedValue(new ForbiddenException());

			await expect(
				service.reviewAppeal('appeal-1', 'user-1', { status: 'accepted' as any })
			).rejects.toThrow(ForbiddenException);
		});

		it('should throw ConflictException when appeal is already resolved', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			appealsRepository.findById.mockResolvedValue(mockAppeal({ status: 'accepted' }));

			await expect(
				service.reviewAppeal('appeal-1', 'admin-1', { status: 'rejected' as any })
			).rejects.toThrow(ConflictException);
		});

		it('should allow review of under_review appeals', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const appeal = mockAppeal({ status: 'under_review' });
			appealsRepository.findById.mockResolvedValue(appeal);
			appealsRepository.update.mockResolvedValue(mockAppeal({ status: 'rejected' }));

			await expect(
				service.reviewAppeal('appeal-1', 'admin-1', { status: 'rejected' as any })
			).resolves.toBeDefined();
		});
	});

	describe('createAppeal — blocked_image', () => {
		it('creates a blocked_image appeal without a sanctionId', async () => {
			appealsRepository.findByUserId.mockResolvedValue([]);
			const created = mockAppeal({
				type: 'blocked_image',
				sanctionId: null,
				evidence: {
					thumbnailBase64: 'data',
					conversationId: 'conv-1',
					messageTempId: 'tmp-1',
				},
			});
			appealsRepository.create.mockResolvedValue(created);

			const result = await service.createAppeal(
				{
					type: 'blocked_image' as any,
					reason: 'false positive',
					evidence: {
						thumbnailBase64: 'data',
						conversationId: 'conv-1',
						messageTempId: 'tmp-1',
					},
				} as any,
				'user-1'
			);

			// Must not fetch a sanction
			expect(sanctionsService.getSanction).not.toHaveBeenCalled();
			expect(appealsRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-1',
					sanctionId: null,
					type: 'blocked_image',
					status: 'pending',
				})
			);
			expect(result).toBe(created);
		});
	});

	describe('reviewAppeal — blocked_image', () => {
		it('publishes approved event and does NOT call liftSanction when accepted', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const appeal = mockAppeal({
				type: 'blocked_image',
				sanctionId: null,
				status: 'pending',
				evidence: { conversationId: 'conv-1', messageTempId: 'tmp-1' },
			});
			appealsRepository.findById.mockResolvedValue(appeal);
			const updated = mockAppeal({
				type: 'blocked_image',
				sanctionId: null,
				status: 'accepted',
				reviewerId: 'admin-1',
				reviewerNotes: 'looks fine',
				evidence: { conversationId: 'conv-1', messageTempId: 'tmp-1' },
			});
			appealsRepository.update.mockResolvedValue(updated);

			await service.reviewAppeal('appeal-1', 'admin-1', {
				status: 'accepted' as any,
				reviewerNotes: 'looks fine',
			});

			expect(sanctionsService.liftSanction).not.toHaveBeenCalled();
			expect(redisPublish).toHaveBeenCalledTimes(1);
			const [channel, rawPayload] = redisPublish.mock.calls[0];
			expect(channel).toBe('whispr:moderation:blocked_image_approved');
			expect(JSON.parse(rawPayload)).toEqual({
				appealId: 'appeal-1',
				userId: 'user-1',
				conversationId: 'conv-1',
				messageTempId: 'tmp-1',
				reviewerNotes: 'looks fine',
			});
		});

		it('publishes rejected event when rejected', async () => {
			rolesService.ensureAdminOrModerator.mockResolvedValue(undefined);
			const appeal = mockAppeal({
				type: 'blocked_image',
				sanctionId: null,
				status: 'pending',
				evidence: { conversationId: 'conv-1', messageTempId: 'tmp-1' },
			});
			appealsRepository.findById.mockResolvedValue(appeal);
			const updated = mockAppeal({
				type: 'blocked_image',
				sanctionId: null,
				status: 'rejected',
				reviewerId: 'admin-1',
				evidence: { conversationId: 'conv-1', messageTempId: 'tmp-1' },
			});
			appealsRepository.update.mockResolvedValue(updated);

			await service.reviewAppeal('appeal-1', 'admin-1', { status: 'rejected' as any });

			expect(sanctionsService.liftSanction).not.toHaveBeenCalled();
			expect(redisPublish).toHaveBeenCalledWith(
				'whispr:moderation:blocked_image_rejected',
				expect.any(String)
			);
		});
	});
});
