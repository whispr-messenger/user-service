import { AddDeletedAtToUsers1775500000000 } from './1775500000000-AddDeletedAtToUsers';

describe('AddDeletedAtToUsers1775500000000', () => {
	let migration: AddDeletedAtToUsers1775500000000;
	let queryRunner: { query: jest.Mock };

	beforeEach(() => {
		migration = new AddDeletedAtToUsers1775500000000();
		queryRunner = { query: jest.fn() };
	});

	it('should have the correct name', () => {
		expect(migration.name).toBe('AddDeletedAtToUsers1775500000000');
	});

	describe('up', () => {
		it('should add deletedAt column to users table', async () => {
			await migration.up(queryRunner as any);

			expect(queryRunner.query).toHaveBeenCalledWith(
				'ALTER TABLE "users"."users" ADD "deletedAt" TIMESTAMP'
			);
		});
	});

	describe('down', () => {
		it('should drop deletedAt column from users table', async () => {
			await migration.down(queryRunner as any);

			expect(queryRunner.query).toHaveBeenCalledWith(
				'ALTER TABLE "users"."users" DROP COLUMN "deletedAt"'
			);
		});
	});
});
