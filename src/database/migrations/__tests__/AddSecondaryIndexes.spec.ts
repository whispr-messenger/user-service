import { QueryRunner } from 'typeorm';
import { AddSecondaryIndexes1775500200000 } from '../1775500200000-AddSecondaryIndexes';

describe('AddSecondaryIndexes1775500200000', () => {
	let migration: AddSecondaryIndexes1775500200000;
	let queryRunner: QueryRunner;

	beforeEach(() => {
		migration = new AddSecondaryIndexes1775500200000();
		queryRunner = { query: jest.fn() } as unknown as QueryRunner;
	});

	it('should have transaction disabled', () => {
		expect(migration.transaction).toBe(false);
	});

	describe('up', () => {
		it('should create all indexes and the pg_trgm extension', async () => {
			await migration.up(queryRunner);

			expect(queryRunner.query).toHaveBeenCalledTimes(5);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				1,
				`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_blocked_users_blocked_id" ON "users"."blocked_users" ("blocked_id")`
			);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				2,
				`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_contacts_contact_id" ON "users"."contacts" ("contact_id")`
			);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				3,
				`CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA public`
			);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				4,
				`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_users_first_name_trgm" ON "users"."users" USING gin ("firstName" gin_trgm_ops)`
			);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				5,
				`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_users_last_name_trgm" ON "users"."users" USING gin ("lastName" gin_trgm_ops)`
			);
		});
	});

	describe('down', () => {
		it('should drop all indexes in reverse order', async () => {
			await migration.down(queryRunner);

			expect(queryRunner.query).toHaveBeenCalledTimes(4);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				1,
				`DROP INDEX CONCURRENTLY IF EXISTS "users"."IDX_users_last_name_trgm"`
			);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				2,
				`DROP INDEX CONCURRENTLY IF EXISTS "users"."IDX_users_first_name_trgm"`
			);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				3,
				`DROP INDEX CONCURRENTLY IF EXISTS "users"."IDX_contacts_contact_id"`
			);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				4,
				`DROP INDEX CONCURRENTLY IF EXISTS "users"."IDX_blocked_users_blocked_id"`
			);
		});
	});
});
