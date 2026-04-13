import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique } from 'typeorm';

export class CreateContactRequests1744364400000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Create the enum type first
		await queryRunner.query(`
			CREATE TYPE "users"."contact_request_status_enum" AS ENUM ('pending', 'accepted', 'rejected')
		`);

		await queryRunner.createTable(
			new Table({
				name: 'contact_requests',
				schema: 'users',
				columns: [
					{
						name: 'id',
						type: 'uuid',
						isPrimary: true,
						generationStrategy: 'uuid',
						default: 'uuid_generate_v4()',
					},
					{
						name: 'requester_id',
						type: 'uuid',
					},
					{
						name: 'recipient_id',
						type: 'uuid',
					},
					{
						name: 'status',
						type: '"users"."contact_request_status_enum"',
						default: `'pending'`,
					},
					{
						name: 'created_at',
						type: 'timestamptz',
						default: 'now()',
					},
					{
						name: 'updated_at',
						type: 'timestamptz',
						default: 'now()',
					},
				],
			}),
			true
		);

		await queryRunner.createForeignKey(
			'users.contact_requests',
			new TableForeignKey({
				columnNames: ['requester_id'],
				referencedTableName: 'users',
				referencedSchema: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'CASCADE',
			})
		);

		await queryRunner.createForeignKey(
			'users.contact_requests',
			new TableForeignKey({
				columnNames: ['recipient_id'],
				referencedTableName: 'users',
				referencedSchema: 'users',
				referencedColumnNames: ['id'],
				onDelete: 'CASCADE',
			})
		);

		await queryRunner.createUniqueConstraint(
			'users.contact_requests',
			new TableUnique({
				columnNames: ['requester_id', 'recipient_id'],
			})
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('users.contact_requests', true, true, true);
		await queryRunner.query('DROP TYPE IF EXISTS "users"."contact_request_status_enum"');
	}
}
