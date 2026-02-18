import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

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

	describe('Health Check', () => {
		it('should return application info', async () => {
			const response = await request(app.getHttpServer()).get('/health').expect(200);
			expect(response).toBeDefined();
			expect(response.body).toBeDefined();
			expect(response.body.status).toBeDefined();
			expect(response.body.timestamp).toBeDefined();
			expect(response.body.services).toBeDefined();
		});
	});
});
