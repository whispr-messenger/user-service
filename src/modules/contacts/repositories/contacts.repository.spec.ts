import { ContactsRepository } from './contacts.repository';
import { Contact } from '../entities/contact.entity';
import { encodeCursor } from '../../common/utils/cursor-pagination.util';

const mockTypeormRepo = {
	create: jest.fn(),
	save: jest.fn(),
	findOne: jest.fn(),
	find: jest.fn(),
	remove: jest.fn(),
};

describe('ContactsRepository', () => {
	let repo: ContactsRepository;

	beforeEach(() => {
		jest.clearAllMocks();
		repo = new ContactsRepository(mockTypeormRepo as any);
	});

	describe('findAllByOwner', () => {
		it('returns contacts for the owner with the contact relation loaded', async () => {
			const contacts = [{ id: 'c1' }] as Contact[];
			mockTypeormRepo.find.mockResolvedValue(contacts);

			const result = await repo.findAllByOwner('owner-1');

			expect(mockTypeormRepo.find).toHaveBeenCalledWith({
				where: { ownerId: 'owner-1' },
				relations: ['contact'],
			});
			expect(result).toBe(contacts);
		});
	});

	describe('findOne', () => {
		it('returns a contact when found', async () => {
			const contact = { id: 'c1' } as Contact;
			mockTypeormRepo.findOne.mockResolvedValue(contact);

			const result = await repo.findOne('owner-1', 'contact-1');

			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { ownerId: 'owner-1', contactId: 'contact-1' },
				relations: ['contact'],
			});
			expect(result).toBe(contact);
		});

		it('returns null when not found', async () => {
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.findOne('owner-1', 'missing');

			expect(result).toBeNull();
		});
	});

	describe('create', () => {
		it('creates and saves a contact with a nickname, then reloads relations', async () => {
			const draft = { ownerId: 'owner-1', contactId: 'contact-1', nickname: 'Bob' } as Contact;
			const saved = { id: 'c1', ...draft } as Contact;
			const reloaded = { ...saved, contact: { id: 'contact-1' } } as Contact;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);
			mockTypeormRepo.findOne.mockResolvedValue(reloaded);

			const result = await repo.create('owner-1', 'contact-1', 'Bob');

			expect(mockTypeormRepo.create).toHaveBeenCalledWith({
				ownerId: 'owner-1',
				contactId: 'contact-1',
				nickname: 'Bob',
			});
			expect(mockTypeormRepo.save).toHaveBeenCalledWith(draft);
			expect(mockTypeormRepo.findOne).toHaveBeenCalledWith({
				where: { id: 'c1' },
				relations: ['contact'],
			});
			expect(result).toBe(reloaded);
		});

		it('defaults nickname to null when not provided', async () => {
			const draft = { ownerId: 'owner-1', contactId: 'contact-1', nickname: null } as Contact;
			const saved = { id: 'c1', ...draft } as Contact;
			mockTypeormRepo.create.mockReturnValue(draft);
			mockTypeormRepo.save.mockResolvedValue(saved);
			mockTypeormRepo.findOne.mockResolvedValue(null);

			const result = await repo.create('owner-1', 'contact-1');

			expect(mockTypeormRepo.create).toHaveBeenCalledWith({
				ownerId: 'owner-1',
				contactId: 'contact-1',
				nickname: null,
			});
			expect(result).toBe(saved);
		});
	});

	describe('save', () => {
		it('delegates to the typeorm save', async () => {
			const contact = { id: 'c1' } as Contact;
			mockTypeormRepo.save.mockResolvedValue(contact);

			const result = await repo.save(contact);

			expect(mockTypeormRepo.save).toHaveBeenCalledWith(contact);
			expect(result).toBe(contact);
		});
	});

	describe('remove', () => {
		it('delegates to the typeorm remove', async () => {
			const contact = { id: 'c1' } as Contact;
			mockTypeormRepo.remove.mockResolvedValue(contact);

			await repo.remove(contact);

			expect(mockTypeormRepo.remove).toHaveBeenCalledWith(contact);
		});
	});

	describe('findAllByOwnerPaginated', () => {
		const mockQb = {
			leftJoinAndSelect: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			andWhere: jest.fn().mockReturnThis(),
			orderBy: jest.fn().mockReturnThis(),
			addOrderBy: jest.fn().mockReturnThis(),
			take: jest.fn().mockReturnThis(),
			getMany: jest.fn(),
		};

		beforeEach(() => {
			(mockTypeormRepo as any).createQueryBuilder = jest.fn().mockReturnValue(mockQb);
			Object.values(mockQb).forEach((fn) => {
				if (typeof fn === 'function' && 'mockClear' in fn) (fn as jest.Mock).mockClear();
			});
			mockQb.leftJoinAndSelect.mockReturnValue(mockQb);
			mockQb.where.mockReturnValue(mockQb);
			mockQb.andWhere.mockReturnValue(mockQb);
			mockQb.orderBy.mockReturnValue(mockQb);
			mockQb.addOrderBy.mockReturnValue(mockQb);
			mockQb.take.mockReturnValue(mockQb);
		});

		const DATE_1 = new Date('2026-01-01T00:00:00.000Z');
		const DATE_2 = new Date('2026-01-02T00:00:00.000Z');

		it('orders by createdAt ASC then id ASC and applies no cursor filter when absent', async () => {
			const items = [
				{ id: 'c1', createdAt: DATE_1 },
				{ id: 'c2', createdAt: DATE_2 },
			] as any[];
			mockQb.getMany.mockResolvedValue(items);

			const result = await repo.findAllByOwnerPaginated('owner-1', 10);

			expect(result).toEqual({ data: items, nextCursor: null, hasMore: false });
			expect(mockQb.orderBy).toHaveBeenCalledWith('contact.createdAt', 'ASC');
			expect(mockQb.addOrderBy).toHaveBeenCalledWith('contact.id', 'ASC');
			expect(mockQb.andWhere).not.toHaveBeenCalled();
		});

		it('applies a composite tuple WHERE and returns an encoded nextCursor when results exceed limit', async () => {
			const items = [
				{ id: 'c1', createdAt: DATE_1 },
				{ id: 'c2', createdAt: DATE_2 },
				{ id: 'c3', createdAt: new Date('2026-01-03T00:00:00.000Z') },
			] as any[];
			mockQb.getMany.mockResolvedValue(items);
			const cursorToken = encodeCursor(new Date('2025-12-31T00:00:00.000Z'), 'c0');

			const result = await repo.findAllByOwnerPaginated('owner-1', 2, cursorToken);

			expect(result.data).toEqual([
				{ id: 'c1', createdAt: DATE_1 },
				{ id: 'c2', createdAt: DATE_2 },
			]);
			expect(result.hasMore).toBe(true);
			expect(result.nextCursor).toBe(encodeCursor(DATE_2, 'c2'));
			expect(mockQb.andWhere).toHaveBeenCalledWith(
				'(contact.createdAt, contact.id) > (:cursorCreatedAt, :cursorId)',
				{ cursorCreatedAt: new Date('2025-12-31T00:00:00.000Z'), cursorId: 'c0' }
			);
		});
	});
});
