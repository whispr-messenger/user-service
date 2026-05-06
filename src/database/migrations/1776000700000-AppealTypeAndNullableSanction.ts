import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppealTypeAndNullableSanction1776000700000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Make sanction_id nullable so blocked_image appeals can skip it
		await queryRunner.query(`ALTER TABLE users.appeals ALTER COLUMN sanction_id DROP NOT NULL`);

		// Add type column (sanction | blocked_image), default to sanction for backward compat
		await queryRunner.query(
			`ALTER TABLE users.appeals ADD COLUMN IF NOT EXISTS type VARCHAR(30) NOT NULL DEFAULT 'sanction' CHECK (type IN ('sanction', 'blocked_image'))`
		);

		// Index to speed up admin queue queries filtered by type + status
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS idx_appeals_type_status ON users.appeals(type, status)`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS users.idx_appeals_type_status`);
		await queryRunner.query(`ALTER TABLE users.appeals DROP COLUMN IF EXISTS type`);
		// Note: cannot safely restore NOT NULL on sanction_id because blocked_image
		// rows may have null sanction_id. Leave the column nullable on rollback.
	}
}
