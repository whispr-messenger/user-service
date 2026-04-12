import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToUsers1775500000000 implements MigrationInterface {
	name = 'AddDeletedAtToUsers1775500000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "users"."users" ADD "deletedAt" TIMESTAMP`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "users"."users" DROP COLUMN "deletedAt"`);
	}
}
