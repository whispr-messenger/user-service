import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhooks1776000500000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users.webhooks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        url VARCHAR(2048) NOT NULL,
        events JSONB NOT NULL DEFAULT '[]',
        secret VARCHAR(255),
        active BOOLEAN NOT NULL DEFAULT true,
        created_by UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
		await queryRunner.query(`CREATE INDEX idx_webhooks_active ON users.webhooks(active)`);
		await queryRunner.query(`CREATE INDEX idx_webhooks_created_by ON users.webhooks(created_by)`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS users.webhooks`);
	}
}
