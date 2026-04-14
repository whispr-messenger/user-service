import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1776000300000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users.audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        actor_id UUID NOT NULL,
        action VARCHAR NOT NULL,
        target_type VARCHAR NOT NULL,
        target_id UUID NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
		await queryRunner.query(
			`CREATE INDEX idx_audit_logs_actor_created ON users.audit_logs(actor_id, created_at)`
		);
		await queryRunner.query(
			`CREATE INDEX idx_audit_logs_target ON users.audit_logs(target_type, target_id)`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS users.audit_logs`);
	}
}
