import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceContactRequestUniqueWithPartialIndex1775500100000 implements MigrationInterface {
	name = 'ReplaceContactRequestUniqueWithPartialIndex1775500100000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "users"."contact_requests" DROP CONSTRAINT "UQ_contact_requests_requester_recipient"`
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "UQ_contact_requests_pending" ON "users"."contact_requests" ("requester_id", "recipient_id") WHERE status = 'pending'`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "users"."UQ_contact_requests_pending"`);
		await queryRunner.query(
			`ALTER TABLE "users"."contact_requests" ADD CONSTRAINT "UQ_contact_requests_requester_recipient" UNIQUE ("requester_id", "recipient_id")`
		);
	}
}
