import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/modules/app.module';
import { JwksService } from '../src/modules/jwt-auth/jwks.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');

describe('HealthController (e2e)', () => {
	let app: INestApplication;

	beforeAll(async () => {
		try {
			// Drop stale enum types that cause TypeORM synchronize failures
			// when another test suite already created the schema
			const tmpDs = new DataSource({
				type: 'postgres',
				host: process.env.DB_HOST || 'localhost',
				port: parseInt(process.env.DB_PORT || '5432', 10),
				username: process.env.DB_USERNAME || 'test',
				password: process.env.DB_PASSWORD || 'test',
				database: process.env.DB_NAME || 'test_db',
				schema: 'users',
			});
			await tmpDs.initialize();
			await tmpDs.query('DROP SCHEMA IF EXISTS users CASCADE');
			await tmpDs.query('CREATE SCHEMA users');
			await tmpDs.destroy();

			const moduleFixture: TestingModule = await Test.createTestingModule({
				imports: [AppModule],
			})
				.overrideProvider(JwksService)
				.useValue({
					isReady: true,
					onModuleInit: () => {},
					getSecretProvider:
						() =>
						(_req: unknown, _raw: unknown, done: (err: unknown, secret?: unknown) => void) =>
							done(null, 'test-secret'),
				})
				.compile();

			app = moduleFixture.createNestApplication();
			await app.init();
		} catch (error) {
			console.error('Failed to initialize test app:', error);
			throw error;
		}
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}
	});

	describe('Health endpoints', () => {
		it('GET /health/live should return 200 with alive status', async () => {
			await request(app.getHttpServer())
				.get('/health/live')
				.expect(200)
				.expect('Content-Type', /application\/json/)
				.expect((res) => {
					expect(res.body.status).toBe('alive');
				});
		});
	});

	describe('404 on unknown routes', () => {
		it('should return 404 for unknown routes', async () => {
			const res = await request(app.getHttpServer()).get('/unknown-route').expect(404);
			expect(res.status).toBe(404);
		});
	});
});
