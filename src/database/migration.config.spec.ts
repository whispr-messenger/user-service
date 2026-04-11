import { DataSource } from 'typeorm';

describe('migration.config', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...originalEnv };
		delete process.env.DB_URL;
		delete process.env.DB_HOST;
		delete process.env.DB_PORT;
		delete process.env.DB_USERNAME;
		delete process.env.DB_PASSWORD;
		delete process.env.DB_NAME;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	function loadDataSource(): DataSource {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		return require('./migration.config').default as DataSource;
	}

	it('parses DB_URL when provided', () => {
		process.env.DB_URL = 'postgres://alice:secret@dbhost:6543/mydb';

		const ds = loadDataSource();
		const opts = ds.options as unknown as Record<string, unknown>;

		expect(opts.type).toBe('postgres');
		expect(opts.host).toBe('dbhost');
		expect(opts.port).toBe(6543);
		expect(opts.username).toBe('alice');
		expect(opts.password).toBe('secret');
		expect(opts.database).toBe('mydb');
	});

	it('falls back to individual env vars when DB_URL is absent', () => {
		process.env.DB_HOST = 'pg';
		process.env.DB_PORT = '15432';
		process.env.DB_USERNAME = 'svc';
		process.env.DB_PASSWORD = 'pwd';
		process.env.DB_NAME = 'users';

		const ds = loadDataSource();
		const opts = ds.options as unknown as Record<string, unknown>;

		expect(opts.host).toBe('pg');
		expect(opts.port).toBe(15432);
		expect(opts.username).toBe('svc');
		expect(opts.password).toBe('pwd');
		expect(opts.database).toBe('users');
	});

	it('uses sensible defaults when no env is set', () => {
		const ds = loadDataSource();
		const opts = ds.options as unknown as Record<string, unknown>;

		expect(opts.host).toBe('localhost');
		expect(opts.port).toBe(5432);
		expect(opts.username).toBe('postgres');
		expect(opts.password).toBe('password');
		expect(opts.database).toBe('user_service');
	});

	it('registers entity and migration glob paths', () => {
		const ds = loadDataSource();
		const opts = ds.options as unknown as Record<string, unknown>;

		const entities = opts.entities as string[];
		const migrations = opts.migrations as string[];

		expect(entities).toHaveLength(1);
		expect(entities[0]).toMatch(/\*\*\/\*\.entity\{\.ts,\.js\}$/);
		expect(migrations).toHaveLength(1);
		expect(migrations[0]).toMatch(/migrations\/\*\{\.ts,\.js\}$/);
	});
});
