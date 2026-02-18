/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';

// Global test setup
beforeAll(async () => {
	// Set test environment variables
	process.env.NODE_ENV = 'test';
	process.env.DB_HOST = 'localhost';
	process.env.DB_PORT = '5432';
	process.env.DB_USERNAME = 'test';
	process.env.DB_PASSWORD = 'test';
	process.env.DB_NAME = 'test_db';
	process.env.DB_SYNCHRONIZE = 'true';
	process.env.DB_LOGGING = 'false';
	process.env.REDIS_HOST = 'localhost';
	process.env.REDIS_PORT = '6379';
	process.env.REDIS_URL = 'redis://localhost:6379/0';
});

// Global test teardown
afterAll(async () => {
	// Cleanup after all tests
});

// Mock Redis
jest.mock('ioredis', () => {
	return jest.fn().mockImplementation(() => ({
		on: jest.fn(),
		connect: jest.fn(),
		disconnect: jest.fn(),
		get: jest.fn(),
		set: jest.fn(),
		del: jest.fn(),
		exists: jest.fn(),
		flushdb: jest.fn(),
	}));
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason) => {
	console.error('Unhandled Rejection:', reason);
});

// Increase timeout for integration tests
jest.setTimeout(30000);
