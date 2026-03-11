import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/modules/app.module';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');

describe('HealthController (e2e)', () => {
	let app: INestApplication;

	beforeAll(async () => {
		try {
			const moduleFixture: TestingModule = await Test.createTestingModule({
				imports: [AppModule],
			}).compile();

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

	describe('Application Bootstrap', () => {
		it('should bootstrap the application successfully', () => {
			expect(app).toBeDefined();
			expect(app.getHttpServer()).toBeDefined();
		});

		it('should have the correct environment setup', () => {
			expect(process.env.NODE_ENV).toBe('test');
		});
	});

	describe('Health endpoints', () => {
		it('GET /health/live should return 200', async () => {
			await request(app.getHttpServer()).get('/health/live').expect(200);
		});
	});

	describe('404 on unknown routes', () => {
		it('should return 404 for unknown routes', async () => {
			await request(app.getHttpServer()).get('/unknown-route').expect(404);
		});
	});
});
