// Environment setup for Docker integration tests
// This file configures environment variables to connect to the Docker services

process.env.NODE_ENV = 'test';

// Database configuration - connects to Docker postgres service
process.env.DB_TYPE = 'postgres';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5433';
process.env.DB_USERNAME = 'dev_user';
process.env.DB_PASSWORD = 'dev_password';
process.env.DB_NAME = 'testing';
process.env.DB_SYNCHRONIZE = 'true';
process.env.DB_LOGGING = 'false';

// Redis configuration - connects to Docker redis service
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Other configuration
process.env.HTTP_PORT = '3001';
