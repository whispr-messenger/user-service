import { AuditRepository } from './audit.repository';
import { AuditLog } from '../entities/audit-log.entity';

const mockQb = {
	andWhere: jest.fn().mockReturnThis(),
	orderBy: jest.fn().mockReturnThis(),
	take: jest.fn().mockReturnThis(),
	skip: jest.fn().mockReturnThis(),
	delete: jest.fn().mockReturnThis(),
	from: jest.fn().mockReturnThis(),
	where: jest.fn().mockReturnThis(),
	execute: jest.fn(),
	getMany: jest.fn(),
	getCount: jest.fn(),
};

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	createQueryBuilder: jest.fn().mockReturnValue(mockQb),
};

describe('AuditRepository', () => {
	let repo: AuditRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		mockTypeormRepo.createQueryBuilder.mockReturnValue(mockQb);
		Object.values(mockQb).forEach((fn) => {
			if (typeof fn === 'function' && 'mockReturnThis' in fn) {
				(fn as jest.Mock).mockReturnThis();
			}
		});
		repo = new AuditRepository(mockTypeormRepo as any);
	});

	describe('create', () => {
		it('creates and persists an audit log', async () => {
			const data = { actorId: 'a1', action: 'x', targetType: 't', targetId: 'id' } as Partial<AuditLog>;
			const draft = { ...data } as AuditLog;
			const saved = { id: 'l1', ...data } as AuditLog;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);

			const result = await repo.create(data);

			expect(mockTypeormRepo.create).toHaveBeenCalledWith(data);
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(result).toBe(saved);
		});
	});

	describe('findAll', () => {
		it('applies pagination with no filters', async () => {
			const logs = [{ id: 'l1' }] as AuditLog[];
			mockQb.getMany.mockResolvedValue(logs);

			const result = await repo.findAll({ limit: 10, offset: 5 });

			expect(mockQb.andWhere).not.toHaveBeenCalled();
			expect(mockQb.orderBy).toHaveBeenCalledWith('audit.created_at', 'DESC');
			expect(mockQb.take).toHaveBeenCalledWith(10);
			expect(mockQb.skip).toHaveBeenCalledWith(5);
			expect(result).toBe(logs);
		});

		it('applies every filter when all options are set', async () => {
			mockQb.getMany.mockResolvedValue([]);
			const dateFrom = new Date('2026-01-01');
			const dateTo = new Date('2026-02-01');

			await repo.findAll({
				limit: 20,
				offset: 0,
				actorId: 'actor-1',
				targetType: 'sanction',
				action: 'sanction_issued',
				dateFrom,
				dateTo,
			});

			expect(mockQb.andWhere).toHaveBeenCalledWith('audit.actor_id = :actorId', { actorId: 'actor-1' });
			expect(mockQb.andWhere).toHaveBeenCalledWith('audit.target_type = :targetType', {
				targetType: 'sanction',
			});
			expect(mockQb.andWhere).toHaveBeenCalledWith('audit.action = :action', {
				action: 'sanction_issued',
			});
			expect(mockQb.andWhere).toHaveBeenCalledWith('audit.created_at >= :dateFrom', { dateFrom });
			expect(mockQb.andWhere).toHaveBeenCalledWith('audit.created_at <= :dateTo', { dateTo });
		});
	});

	describe('countAll', () => {
		it('returns the count from the query builder applying filters', async () => {
			mockQb.getCount.mockResolvedValue(42);

			const result = await repo.countAll({ actorId: 'actor-1' });

			expect(mockQb.andWhere).toHaveBeenCalledWith('audit.actor_id = :actorId', { actorId: 'actor-1' });
			expect(result).toBe(42);
		});

		it('returns 0 when no rows match', async () => {
			mockQb.getCount.mockResolvedValue(0);

			const result = await repo.countAll({});

			expect(result).toBe(0);
			expect(mockQb.andWhere).not.toHaveBeenCalled();
		});
	});

	describe('deleteOlderThan', () => {
		it('removes audit logs strictly older than cutoff and returns the affected count', async () => {
			const cutoff = new Date('2025-01-01');
			mockQb.execute.mockResolvedValue({ affected: 12 });

			const result = await repo.deleteOlderThan(cutoff);

			expect(mockQb.delete).toHaveBeenCalled();
			expect(mockQb.from).toHaveBeenCalledWith(AuditLog);
			expect(mockQb.where).toHaveBeenCalledWith('created_at < :cutoff', { cutoff });
			expect(result).toBe(12);
		});

		it('returns 0 when affected is undefined', async () => {
			mockQb.execute.mockResolvedValue({ affected: undefined });

			const result = await repo.deleteOlderThan(new Date());

			expect(result).toBe(0);
		});
	});
});
