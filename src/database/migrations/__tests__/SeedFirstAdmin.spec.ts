import { SeedFirstAdmin1776000600000 } from '../1776000600000-SeedFirstAdmin';

const TARGET_USER_ID = '3378ee73-ce43-4145-b689-ba982d97721e';

describe('SeedFirstAdmin1776000600000', () => {
	let migration: SeedFirstAdmin1776000600000;
	let queryRunner: { query: jest.Mock };

	beforeEach(() => {
		migration = new SeedFirstAdmin1776000600000();
		queryRunner = { query: jest.fn() };
	});

	describe('up', () => {
		it('inserts an admin role for the target user with ON CONFLICT upsert', async () => {
			await migration.up(queryRunner as any);

			expect(queryRunner.query).toHaveBeenCalledTimes(1);
			const sql = queryRunner.query.mock.calls[0][0] as string;
			expect(sql).toContain('INSERT INTO users.user_roles');
			expect(sql).toContain(TARGET_USER_ID);
			expect(sql).toContain("'admin'");
			expect(sql).toContain('ON CONFLICT (user_id) DO UPDATE SET role');
		});
	});

	describe('down', () => {
		it('deletes the admin role for the target user', async () => {
			await migration.down(queryRunner as any);

			expect(queryRunner.query).toHaveBeenCalledTimes(1);
			const sql = queryRunner.query.mock.calls[0][0] as string;
			expect(sql).toContain('DELETE FROM users.user_roles');
			expect(sql).toContain(TARGET_USER_ID);
		});
	});
});
