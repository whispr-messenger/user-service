import { applyCursorPagination } from './cursor-pagination.util';

function createMockQb(results: any[]) {
	const qb: any = {
		orderBy: jest.fn().mockReturnThis(),
		take: jest.fn().mockReturnThis(),
		andWhere: jest.fn().mockReturnThis(),
		getMany: jest.fn().mockResolvedValue(results),
	};
	return qb;
}

describe('applyCursorPagination', () => {
	it('returns all items with hasMore=false when results fit within limit', async () => {
		const items = [{ id: 'a1' }, { id: 'a2' }];
		const qb = createMockQb(items);

		const result = await applyCursorPagination(qb, {
			alias: 'entity',
			limit: 10,
		});

		expect(result).toEqual({ data: items, nextCursor: null, hasMore: false });
		expect(qb.orderBy).toHaveBeenCalledWith('entity.id', 'ASC');
		expect(qb.take).toHaveBeenCalledWith(11);
		expect(qb.andWhere).not.toHaveBeenCalled();
	});

	it('returns hasMore=true and nextCursor when results exceed limit', async () => {
		const items = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }];
		const qb = createMockQb(items);

		const result = await applyCursorPagination(qb, {
			alias: 'entity',
			limit: 2,
		});

		expect(result).toEqual({
			data: [{ id: 'a1' }, { id: 'a2' }],
			nextCursor: 'a2',
			hasMore: true,
		});
	});

	it('applies cursor filter with > operator for ASC direction', async () => {
		const qb = createMockQb([]);

		await applyCursorPagination(qb, {
			alias: 'entity',
			limit: 10,
			cursor: 'cursor-id',
			direction: 'ASC',
		});

		expect(qb.andWhere).toHaveBeenCalledWith('entity.id > :cursor', { cursor: 'cursor-id' });
	});

	it('applies cursor filter with < operator for DESC direction', async () => {
		const qb = createMockQb([]);

		await applyCursorPagination(qb, {
			alias: 'entity',
			limit: 10,
			cursor: 'cursor-id',
			direction: 'DESC',
		});

		expect(qb.orderBy).toHaveBeenCalledWith('entity.id', 'DESC');
		expect(qb.andWhere).toHaveBeenCalledWith('entity.id < :cursor', { cursor: 'cursor-id' });
	});

	it('defaults direction to ASC when not specified', async () => {
		const qb = createMockQb([]);

		await applyCursorPagination(qb, {
			alias: 'entity',
			limit: 10,
		});

		expect(qb.orderBy).toHaveBeenCalledWith('entity.id', 'ASC');
	});

	it('uses custom idColumn when provided', async () => {
		const qb = createMockQb([]);

		await applyCursorPagination(qb, {
			alias: 'entity',
			limit: 10,
			cursor: 'cursor-id',
			idColumn: 'customId',
		});

		expect(qb.orderBy).toHaveBeenCalledWith('entity.customId', 'ASC');
		expect(qb.andWhere).toHaveBeenCalledWith('entity.customId > :cursor', {
			cursor: 'cursor-id',
		});
	});

	it('returns empty data with hasMore=false when no results', async () => {
		const qb = createMockQb([]);

		const result = await applyCursorPagination(qb, {
			alias: 'entity',
			limit: 10,
		});

		expect(result).toEqual({ data: [], nextCursor: null, hasMore: false });
	});

	it('returns exactly limit items when results equal limit (no extra)', async () => {
		const items = [{ id: 'a1' }, { id: 'a2' }];
		const qb = createMockQb(items);

		const result = await applyCursorPagination(qb, {
			alias: 'entity',
			limit: 2,
		});

		expect(result).toEqual({ data: items, nextCursor: null, hasMore: false });
	});
});
