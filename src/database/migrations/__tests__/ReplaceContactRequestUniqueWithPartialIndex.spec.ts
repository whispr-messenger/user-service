import { QueryRunner } from 'typeorm';
import { ReplaceContactRequestUniqueWithPartialIndex1775500100000 } from '../1775500100000-ReplaceContactRequestUniqueWithPartialIndex';

describe('ReplaceContactRequestUniqueWithPartialIndex1775500100000', () => {
	let migration: ReplaceContactRequestUniqueWithPartialIndex1775500100000;
	let queryRunner: QueryRunner;

	beforeEach(() => {
		migration = new ReplaceContactRequestUniqueWithPartialIndex1775500100000();
		queryRunner = {
			query: jest.fn().mockResolvedValue(undefined),
		} as unknown as QueryRunner;
	});

	describe('up', () => {
		it('should drop the old unique constraint and create a partial unique index', async () => {
			await migration.up(queryRunner);

			expect(queryRunner.query).toHaveBeenCalledTimes(2);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				1,
				`ALTER TABLE "users"."contact_requests" DROP CONSTRAINT "UQ_contact_requests_requester_recipient"`
			);
			expect(queryRunner.query).toHaveBeenNthCalledWith(
				2,
				`CREATE UNIQUE INDEX "UQ_contact_requests_pending" ON "users"."contact_requests" ("requester_id", "recipient_id") WHERE status = 'pending'`
			);
		});
	});

	describe('down', () => {
		it('should throw an error because the migration is irreversible', async () => {
			await expect(migration.down(queryRunner)).rejects.toThrow('Irreversible migration');
		});
	});
});
