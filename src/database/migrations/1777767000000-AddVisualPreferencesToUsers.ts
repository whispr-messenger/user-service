import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVisualPreferencesToUsers1777767000000 implements MigrationInterface {
	name = 'AddVisualPreferencesToUsers1777767000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "users"."users" ADD COLUMN "visualPreferences" jsonb`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "users"."users" DROP COLUMN "visualPreferences"`
		);
	}
}
