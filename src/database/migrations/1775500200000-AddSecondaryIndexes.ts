import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSecondaryIndexes1775500200000 implements MigrationInterface {
	name = 'AddSecondaryIndexes1775500200000';
	transaction = false;

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_blocked_users_blocked_id" ON "users"."blocked_users" ("blocked_id")`
		);
		await queryRunner.query(
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_contacts_contact_id" ON "users"."contacts" ("contact_id")`
		);
		await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA public`);
		await queryRunner.query(
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_users_first_name_trgm" ON "users"."users" USING gin ("firstName" gin_trgm_ops)`
		);
		await queryRunner.query(
			`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_users_last_name_trgm" ON "users"."users" USING gin ("lastName" gin_trgm_ops)`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "users"."IDX_users_last_name_trgm"`);
		await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "users"."IDX_users_first_name_trgm"`);
		await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "users"."IDX_contacts_contact_id"`);
		await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "users"."IDX_blocked_users_blocked_id"`);
	}
}
