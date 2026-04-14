import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserReputation1776000400000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users.user_reputation (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users.users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL DEFAULT 100,
        total_reports_received INTEGER NOT NULL DEFAULT 0,
        total_reports_filed INTEGER NOT NULL DEFAULT 0,
        total_sanctions INTEGER NOT NULL DEFAULT 0,
        total_appeals INTEGER NOT NULL DEFAULT 0,
        appeals_accepted INTEGER NOT NULL DEFAULT 0,
        last_sanction_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
		await queryRunner.query(`CREATE INDEX idx_user_reputation_user_id ON users.user_reputation(user_id)`);
		await queryRunner.query(`CREATE INDEX idx_user_reputation_score ON users.user_reputation(score)`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS users.user_reputation`);
	}
}
