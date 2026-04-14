import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppeals1776000200000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users.appeals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
        sanction_id UUID NOT NULL REFERENCES users.user_sanctions(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        evidence JSONB DEFAULT '{}',
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'accepted', 'rejected')),
        reviewer_id UUID,
        reviewer_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE
      )
    `);
		await queryRunner.query(`CREATE INDEX idx_appeals_user_status ON users.appeals(user_id, status)`);
		await queryRunner.query(`CREATE INDEX idx_appeals_sanction ON users.appeals(sanction_id)`);
		await queryRunner.query(`CREATE INDEX idx_appeals_status ON users.appeals(status)`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS users.appeals`);
	}
}
