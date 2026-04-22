import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserBackups1776000800000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS users.user_backups (
				id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
				user_id UUID NOT NULL,
				data JSONB NOT NULL,
				size_bytes INTEGER NOT NULL DEFAULT 0,
				created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				CONSTRAINT fk_user_backups_user
					FOREIGN KEY (user_id)
					REFERENCES users.users(id)
					ON DELETE CASCADE
			)
		`);
		await queryRunner.query(`CREATE INDEX idx_user_backups_user_id ON users.user_backups(user_id)`);
		await queryRunner.query(
			`CREATE INDEX idx_user_backups_user_created_at ON users.user_backups(user_id, created_at DESC)`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS users.idx_user_backups_user_created_at`);
		await queryRunner.query(`DROP INDEX IF EXISTS users.idx_user_backups_user_id`);
		await queryRunner.query(`DROP TABLE IF EXISTS users.user_backups`);
	}
}
