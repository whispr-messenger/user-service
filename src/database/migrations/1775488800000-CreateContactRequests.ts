import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContactRequests1775488800000 implements MigrationInterface {
	name = 'CreateContactRequests1775488800000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "users"."contact_requests_status_enum" AS ENUM ('pending', 'accepted', 'rejected')`
		);
		await queryRunner.query(
			`CREATE TABLE "users"."contact_requests" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"requester_id" uuid NOT NULL,
				"recipient_id" uuid NOT NULL,
				"status" "users"."contact_requests_status_enum" NOT NULL DEFAULT 'pending',
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				CONSTRAINT "UQ_contact_requests_requester_recipient" UNIQUE ("requester_id", "recipient_id"),
				CONSTRAINT "PK_contact_requests" PRIMARY KEY ("id")
			)`
		);
		await queryRunner.query(
			`ALTER TABLE "users"."contact_requests" ADD CONSTRAINT "FK_contact_requests_requester" FOREIGN KEY ("requester_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "users"."contact_requests" ADD CONSTRAINT "FK_contact_requests_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_contact_requests_recipient_status" ON "users"."contact_requests" ("recipient_id", "status")`
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_contact_requests_requester_status" ON "users"."contact_requests" ("requester_id", "status")`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "users"."IDX_contact_requests_requester_status"`);
		await queryRunner.query(`DROP INDEX "users"."IDX_contact_requests_recipient_status"`);
		await queryRunner.query(
			`ALTER TABLE "users"."contact_requests" DROP CONSTRAINT "FK_contact_requests_recipient"`
		);
		await queryRunner.query(
			`ALTER TABLE "users"."contact_requests" DROP CONSTRAINT "FK_contact_requests_requester"`
		);
		await queryRunner.query(`DROP TABLE "users"."contact_requests"`);
		await queryRunner.query(`DROP TYPE "users"."contact_requests_status_enum"`);
	}
}
