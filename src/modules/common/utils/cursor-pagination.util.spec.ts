import { BadRequestException } from '@nestjs/common';
import { applyCursorPagination, encodeCursor } from './cursor-pagination.util';

function createMockQb(results: any[]) {
	const qb: any = {
		orderBy: jest.fn().mockReturnThis(),
		addOrderBy: jest.fn().mockReturnThis(),
		take: jest.fn().mockReturnThis(),
		andWhere: jest.fn().mockReturnThis(),
		getMany: jest.fn().mockResolvedValue(results),
	};
	return qb;
}

const DATE_A = new Date('2026-01-01T10:00:00.000Z');
const DATE_B = new Date('2026-01-02T10:00:00.000Z');
const DATE_C = new Date('2026-01-03T10:00:00.000Z');

describe('encodeCursor', () => {
	it('produces a base64url token that encodes (createdAt, id)', () => {
		const token = encodeCursor(DATE_A, 'uuid-1');
		const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
		expect(decoded).toEqual({ c: DATE_A.toISOString(), i: 'uuid-1' });
	});

	it('produces URL-safe tokens (no +, /, = characters)', () => {
		const token = encodeCursor(DATE_A, 'uuid-1');
		expect(token).not.toMatch(/[+/=]/);
	});
});

describe('applyCursorPagination', () => {
	it('orders primarily by createdAt and secondarily by id, both DESC by default direction override', async () => {
		const qb = createMockQb([]);

		await applyCursorPagination(qb, { alias: 'entity', limit: 10, direction: 'DESC' });

		expect(qb.orderBy).toHaveBeenCalledWith('entity.createdAt', 'DESC');
		expect(qb.addOrderBy).toHaveBeenCalledWith('entity.id', 'DESC');
		expect(qb.take).toHaveBeenCalledWith(11);
	});

	it('defaults to ASC direction on both sort columns', async () => {
		const qb = createMockQb([]);

		await applyCursorPagination(qb, { alias: 'entity', limit: 10 });

		expect(qb.orderBy).toHaveBeenCalledWith('entity.createdAt', 'ASC');
		expect(qb.addOrderBy).toHaveBeenCalledWith('entity.id', 'ASC');
	});

	it('returns all items with hasMore=false when results fit within limit', async () => {
		const items = [
			{ id: 'a1', createdAt: DATE_A },
			{ id: 'a2', createdAt: DATE_B },
		];
		const qb = createMockQb(items);

		const result = await applyCursorPagination(qb, { alias: 'entity', limit: 10 });

		expect(result).toEqual({ data: items, nextCursor: null, hasMore: false });
		expect(qb.andWhere).not.toHaveBeenCalled();
	});

	it('returns hasMore=true and a composite nextCursor when results exceed limit', async () => {
		const items = [
			{ id: 'a1', createdAt: DATE_A },
			{ id: 'a2', createdAt: DATE_B },
			{ id: 'a3', createdAt: DATE_C },
		];
		const qb = createMockQb(items);

		const result = await applyCursorPagination(qb, { alias: 'entity', limit: 2 });

		expect(result.hasMore).toBe(true);
		expect(result.data).toEqual([items[0], items[1]]);
		expect(result.nextCursor).toBe(encodeCursor(DATE_B, 'a2'));
	});

	it('applies a composite tuple WHERE with < when direction is DESC', async () => {
		const qb = createMockQb([]);
		const token = encodeCursor(DATE_B, 'a2');

		await applyCursorPagination(qb, {
			alias: 'entity',
			limit: 10,
			cursor: token,
			direction: 'DESC',
		});

		expect(qb.andWhere).toHaveBeenCalledWith(
			'(entity.createdAt, entity.id) < (:cursorCreatedAt, :cursorId)',
			{ cursorCreatedAt: DATE_B, cursorId: 'a2' }
		);
	});

	it('applies a composite tuple WHERE with > when direction is ASC', async () => {
		const qb = createMockQb([]);
		const token = encodeCursor(DATE_A, 'a1');

		await applyCursorPagination(qb, {
			alias: 'entity',
			limit: 10,
			cursor: token,
			direction: 'ASC',
		});

		expect(qb.andWhere).toHaveBeenCalledWith(
			'(entity.createdAt, entity.id) > (:cursorCreatedAt, :cursorId)',
			{ cursorCreatedAt: DATE_A, cursorId: 'a1' }
		);
	});

	it('throws BadRequestException when the cursor is not valid base64url JSON', async () => {
		const qb = createMockQb([]);

		await expect(
			applyCursorPagination(qb, { alias: 'entity', limit: 10, cursor: '!!!not-base64!!!' })
		).rejects.toThrow(BadRequestException);
	});

	it('throws BadRequestException when the decoded cursor is missing required fields', async () => {
		const qb = createMockQb([]);
		const malformed = Buffer.from(JSON.stringify({ c: DATE_A.toISOString() }), 'utf8').toString(
			'base64url'
		);

		await expect(
			applyCursorPagination(qb, { alias: 'entity', limit: 10, cursor: malformed })
		).rejects.toThrow(BadRequestException);
	});

	it('throws BadRequestException when the cursor createdAt is not a parseable date', async () => {
		const qb = createMockQb([]);
		const malformed = Buffer.from(JSON.stringify({ c: 'not-a-date', i: 'uuid' }), 'utf8').toString(
			'base64url'
		);

		await expect(
			applyCursorPagination(qb, { alias: 'entity', limit: 10, cursor: malformed })
		).rejects.toThrow(BadRequestException);
	});

	it('returns empty data with hasMore=false when no results', async () => {
		const qb = createMockQb([]);

		const result = await applyCursorPagination(qb, { alias: 'entity', limit: 10 });

		expect(result).toEqual({ data: [], nextCursor: null, hasMore: false });
	});

	it('returns exactly limit items with nextCursor=null when results equal limit', async () => {
		const items = [
			{ id: 'a1', createdAt: DATE_A },
			{ id: 'a2', createdAt: DATE_B },
		];
		const qb = createMockQb(items);

		const result = await applyCursorPagination(qb, { alias: 'entity', limit: 2 });

		expect(result).toEqual({ data: items, nextCursor: null, hasMore: false });
	});
});
