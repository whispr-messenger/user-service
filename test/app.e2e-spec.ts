import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/modules/app.module';
import { JwksService } from '../src/modules/jwt-auth/jwks.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');

describe('HealthController (e2e)', () => {
	let app: INestApplication;

	beforeAll(async () => {
		try {
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
