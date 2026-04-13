import { SelectQueryBuilder } from 'typeorm';
import { CursorPaginatedResult } from '../dto/cursor-pagination.dto';

export interface CursorPaginationOptions {
	alias: string;
	limit: number;
	cursor?: string;
	direction?: 'ASC' | 'DESC';
	idColumn?: string;
}

export async function applyCursorPagination<T extends { id: string }>(
	qb: SelectQueryBuilder<T>,
	options: CursorPaginationOptions
): Promise<CursorPaginatedResult<T>> {
	const { alias, limit, cursor, direction = 'ASC', idColumn = 'id' } = options;
	const column = `${alias}.${idColumn}`;

	qb.orderBy(column, direction).take(limit + 1);

	if (cursor) {
		const operator = direction === 'ASC' ? '>' : '<';
		qb.andWhere(`${column} ${operator} :cursor`, { cursor });
	}

	const results = await qb.getMany();
	const hasMore = results.length > limit;
	const data = hasMore ? results.slice(0, limit) : results;

	return {
		data,
		nextCursor: hasMore ? data[data.length - 1].id : null,
		hasMore,
	};
}
