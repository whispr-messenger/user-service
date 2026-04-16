import { BadRequestException } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { CursorPaginatedResult } from '../dto/cursor-pagination.dto';

export interface CursorPaginationOptions {
	alias: string;
	limit: number;
	cursor?: string;
	direction?: 'ASC' | 'DESC';
}

interface CompositeCursor {
	c: string;
	i: string;
}

export function encodeCursor(createdAt: Date, id: string): string {
	const payload: CompositeCursor = { c: createdAt.toISOString(), i: id };
	return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(token: string): { createdAt: Date; id: string } {
	let parsed: CompositeCursor;
	try {
		const json = Buffer.from(token, 'base64url').toString('utf8');
		parsed = JSON.parse(json) as CompositeCursor;
	} catch {
		throw new BadRequestException('Invalid pagination cursor');
	}

	if (!parsed || typeof parsed.c !== 'string' || typeof parsed.i !== 'string') {
		throw new BadRequestException('Invalid pagination cursor');
	}

	const createdAt = new Date(parsed.c);
	if (Number.isNaN(createdAt.getTime())) {
		throw new BadRequestException('Invalid pagination cursor');
	}

	return { createdAt, id: parsed.i };
}

export async function applyCursorPagination<T extends { id: string; createdAt: Date }>(
	qb: SelectQueryBuilder<T>,
	options: CursorPaginationOptions
): Promise<CursorPaginatedResult<T>> {
	const { alias, limit, cursor, direction = 'ASC' } = options;
	const createdAtColumn = `${alias}.createdAt`;
	const idColumn = `${alias}.id`;

	qb.orderBy(createdAtColumn, direction)
		.addOrderBy(idColumn, direction)
		.take(limit + 1);

	if (cursor) {
		const decoded = decodeCursor(cursor);
		const operator = direction === 'ASC' ? '>' : '<';
		qb.andWhere(`(${createdAtColumn}, ${idColumn}) ${operator} (:cursorCreatedAt, :cursorId)`, {
			cursorCreatedAt: decoded.createdAt,
			cursorId: decoded.id,
		});
	}

	const results = await qb.getMany();
	const hasMore = results.length > limit;
	const data = hasMore ? results.slice(0, limit) : results;

	const last = data[data.length - 1];
	const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

	return { data, nextCursor, hasMore };
}
