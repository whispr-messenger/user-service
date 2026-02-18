/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';

// E2E test setup
beforeAll(async () => {
	process.env.NODE_ENV = 'test';
	process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
	process.env.HTTP_PORT = process.env.HTTP_PORT || '3000';
	process.env.DB_SYNCHRONIZE = process.env.DB_SYNCHRONIZE || 'true';
	process.env.DB_LOGGING = process.env.DB_LOGGING || 'false';
});

// Global E2E teardown
afterAll(async () => {
	console.log('E2E tests completed');
});

// Increase timeout for E2E tests
jest.setTimeout(60000);
