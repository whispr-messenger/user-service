describe('runEnvChecks', () => {
	let originalEnv: NodeJS.ProcessEnv;
	let consoleLogSpy: jest.SpyInstance;
	let consoleErrorSpy: jest.SpyInstance;
	let consoleWarnSpy: jest.SpyInstance;
	let runEnvChecks: () => void;

	beforeEach(() => {
		// Save original environment
		originalEnv = { ...process.env };

		// Mock console methods
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

		// Clear environment variables
		process.env = {};

		// Clear module cache to reset the global variables in check-env
		jest.resetModules();

		// Import the module fresh for each test
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		runEnvChecks = require('./check-env').default;
	});

	afterEach(() => {
		// Restore original environment
		process.env = originalEnv;

		// Restore console methods
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();
		consoleWarnSpy.mockRestore();
	});

	describe('with all required variables', () => {
		beforeEach(() => {
			// Set all required environment variables
			process.env.NODE_ENV = 'production';
			process.env.DATABASE_HOST = 'localhost';
			process.env.DATABASE_PORT = '5432';
			process.env.DATABASE_USERNAME = 'user';
			process.env.DATABASE_PASSWORD = 'password';
			process.env.DATABASE_NAME = 'user_service';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
		});

		it('should pass when all required environment variables are set', () => {
			expect(() => runEnvChecks()).not.toThrow();

			// Verify success message
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('All required environment variables are set!')
			);
		});

		it('should log header and footer', () => {
			runEnvChecks();

			expect(consoleLogSpy).toHaveBeenCalledWith('==================================================');
			expect(consoleLogSpy).toHaveBeenCalledWith('  Whispr User Service - Environment Check');
		});

		it('should check all required variables', () => {
			runEnvChecks();

			const requiredVars = [
				'NODE_ENV',
				'DATABASE_HOST',
				'DATABASE_PORT',
				'DATABASE_USERNAME',
				'DATABASE_PASSWORD',
				'DATABASE_NAME',
				'REDIS_HOST',
				'REDIS_PORT',
				'HTTP_PORT',
				'GRPC_PORT',
			];

			requiredVars.forEach((varName) => {
				expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`${varName} is set`));
			});
		});
	});

	describe('with missing required variables', () => {
		it('should throw error when NODE_ENV is missing', () => {
			process.env.DATABASE_HOST = 'localhost';
			// ... other set ...
			expect(() => runEnvChecks()).toThrow('Missing required environment variables');
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('NODE_ENV is NOT set (REQUIRED)')
			);
		});

		it('should throw error when DATABASE_HOST is missing', () => {
			process.env.NODE_ENV = 'production';
			expect(() => runEnvChecks()).toThrow('Missing required environment variables');
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('DATABASE_HOST is NOT set (REQUIRED)')
			);
		});
	});

	describe('with optional variables', () => {
		beforeEach(() => {
			process.env.NODE_ENV = 'production';
			process.env.DATABASE_HOST = 'localhost';
			process.env.DATABASE_PORT = '5432';
			process.env.DATABASE_USERNAME = 'user';
			process.env.DATABASE_PASSWORD = 'password';
			process.env.DATABASE_NAME = 'user_service';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
		});

		it('should log optional variables when set', () => {
			process.env.DATABASE_LOGGING = 'true';
			runEnvChecks();
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DATABASE_LOGGING is set'));
		});

		it('should warn about unset optional variables', () => {
			runEnvChecks();
			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL is NOT set'));
		});
	});
});
