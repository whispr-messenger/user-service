import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSanctions1776000100000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users.user_sanctions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL CHECK (type IN ('warning', 'temp_ban', 'perm_ban')),
        reason TEXT NOT NULL,
        evidence_ref JSONB DEFAULT '{}',
        issued_by UUID NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
		await queryRunner.query(
			`CREATE INDEX idx_user_sanctions_user_active ON users.user_sanctions(user_id, active)`
		);
		await queryRunner.query(`CREATE INDEX idx_user_sanctions_type ON users.user_sanctions(type)`);
		await queryRunner.query(
			`CREATE INDEX idx_user_sanctions_expires ON users.user_sanctions(expires_at) WHERE active = true AND expires_at IS NOT NULL`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS users.user_sanctions`);
	}
}
