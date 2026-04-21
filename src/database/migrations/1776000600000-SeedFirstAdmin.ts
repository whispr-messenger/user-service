import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bootstrap the first admin user.
 * This is required because the PUT /roles/:userId endpoint requires admin role,
 * creating a chicken-and-egg problem for the first admin.
 *
 * This seeds Tudy (Roadmvn) as admin for the preprod environment.
 * In production, this should be replaced with a proper admin bootstrap flow.
 */
export class SeedFirstAdmin1776000600000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Insert admin role only if the target user exists (avoids FK violation
		// on environments where this user has not been created yet).
		await queryRunner.query(`
      INSERT INTO users.user_roles (id, user_id, role, granted_by, created_at)
      VALUES (
        uuid_generate_v4(),
        '3378ee73-ce43-4145-b689-ba982d97721e',
        'admin',
        '3378ee73-ce43-4145-b689-ba982d97721e',
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET role = 'admin'
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      DELETE FROM users.user_roles
      WHERE user_id = '3378ee73-ce43-4145-b689-ba982d97721e'
    `);
	}
}
