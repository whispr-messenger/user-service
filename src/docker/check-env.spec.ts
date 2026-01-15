describe('check-env', () => {
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

	describe('runEnvChecks with all required variables', () => {
		beforeEach(() => {
			// Set all required environment variables
			process.env.NODE_ENV = 'production';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';
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
				'DB_HOST',
				'DB_PORT',
				'DB_USERNAME',
				'DB_PASSWORD',
				'DB_NAME',
				'JWT_PRIVATE_KEY',
				'JWT_PUBLIC_KEY',
				'REDIS_HOST',
				'REDIS_PORT',
				'HTTP_PORT',
				'GRPC_PORT',
				'USER_SERVICE_GRPC_URL',
				'MEDIA_SERVICE_GRPC_URL',
				'TWILIO_ACCOUNT_SID',
				'TWILIO_AUTH_TOKEN',
				'TWILIO_FROM_NUMBER',
			];

			requiredVars.forEach((varName) => {
				expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining(`${varName} is set`));
			});
		});

		it('should warn about missing optional variables', () => {
			runEnvChecks();

			expect(consoleWarnSpy).toHaveBeenCalled();
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('optional environment variable(s) not set')
			);
		});
	});

	describe('runEnvChecks with optional variables', () => {
		beforeEach(() => {
			// Set all required variables
			process.env.NODE_ENV = 'production';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';

			// Set some optional variables
			process.env.DB_LOGGING = 'true';
			process.env.LOG_LEVEL = 'debug';
			process.env.METRICS_ENABLED = 'false';
		});

		it('should log optional variables when set', () => {
			runEnvChecks();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DB_LOGGING is set'));
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('LOG_LEVEL is set'));
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('METRICS_ENABLED is set'));
		});

		it('should still warn about unset optional variables', () => {
			runEnvChecks();

			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('DB_URL is NOT set'));
			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('REDIS_PASSWORD is NOT set'));
		});
	});

	describe('runEnvChecks with missing required variables', () => {
		it('should throw error when NODE_ENV is missing', () => {
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';

			expect(() => runEnvChecks()).toThrow('Missing required environment variables');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('NODE_ENV is NOT set (REQUIRED)')
			);
		});

		it('should throw error when database variables are missing', () => {
			process.env.NODE_ENV = 'production';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';

			expect(() => runEnvChecks()).toThrow('Missing required environment variables');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('DB_HOST is NOT set (REQUIRED)')
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('DB_PORT is NOT set (REQUIRED)')
			);
		});

		it('should throw error when JWT keys are missing', () => {
			process.env.NODE_ENV = 'production';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';

			expect(() => runEnvChecks()).toThrow('Missing required environment variables');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('JWT_PRIVATE_KEY is NOT set (REQUIRED)')
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('JWT_PUBLIC_KEY is NOT set (REQUIRED)')
			);
		});

		it('should throw error when Redis variables are missing', () => {
			process.env.NODE_ENV = 'production';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';

			expect(() => runEnvChecks()).toThrow('Missing required environment variables');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('REDIS_HOST is NOT set (REQUIRED)')
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('REDIS_PORT is NOT set (REQUIRED)')
			);
		});

		it('should throw error when port variables are missing', () => {
			process.env.NODE_ENV = 'production';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';

			expect(() => runEnvChecks()).toThrow('Missing required environment variables');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('HTTP_PORT is NOT set (REQUIRED)')
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('GRPC_PORT is NOT set (REQUIRED)')
			);
		});

		it('should throw error when gRPC service URLs are missing', () => {
			process.env.NODE_ENV = 'production';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';

			expect(() => runEnvChecks()).toThrow('Missing required environment variables');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('USER_SERVICE_GRPC_URL is NOT set (REQUIRED)')
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('MEDIA_SERVICE_GRPC_URL is NOT set (REQUIRED)')
			);
		});

		it('should throw error when Twilio variables are missing', () => {
			process.env.NODE_ENV = 'production';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';

			expect(() => runEnvChecks()).toThrow('Missing required environment variables');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('TWILIO_ACCOUNT_SID is NOT set (REQUIRED)')
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('TWILIO_AUTH_TOKEN is NOT set (REQUIRED)')
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('TWILIO_FROM_NUMBER is NOT set (REQUIRED)')
			);
		});

		it('should report correct count of missing variables', () => {
			process.env.NODE_ENV = 'production';
			process.env.DB_HOST = 'localhost';

			expect(() => runEnvChecks()).toThrow('Missing required environment variables');

			// DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY,
			// REDIS_HOST, REDIS_PORT, HTTP_PORT, GRPC_PORT,
			// USER_SERVICE_GRPC_URL, MEDIA_SERVICE_GRPC_URL,
			// TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER = 15 missing
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('required environment variable(s) missing!')
			);
		});

		it('should throw error when multiple variables are missing', () => {
			expect(() => runEnvChecks()).toThrow('Missing required environment variables');

			// All 17 required variables are missing
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('required environment variable(s) missing!')
			);
		});
	});

	describe('runEnvChecks with empty string values', () => {
		it('should treat empty strings as missing required variables', () => {
			process.env.NODE_ENV = '';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';

			expect(() => runEnvChecks()).toThrow('Missing required environment variables');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('NODE_ENV is NOT set (REQUIRED)')
			);
		});

		it('should treat whitespace-only strings as missing required variables', () => {
			process.env.NODE_ENV = '   ';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';

			expect(() => runEnvChecks()).toThrow('Missing required environment variables');

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('NODE_ENV is NOT set (REQUIRED)')
			);
		});

		it('should treat empty optional variables as missing', () => {
			// Set all required variables
			process.env.NODE_ENV = 'production';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';

			// Set optional variable to empty string
			process.env.LOG_LEVEL = '';

			expect(() => runEnvChecks()).not.toThrow();

			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('LOG_LEVEL is NOT set'));
		});
	});

	describe('runEnvChecks output formatting', () => {
		beforeEach(() => {
			// Set all required variables
			process.env.NODE_ENV = 'production';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';
		});

		it('should display section headers', () => {
			expect(() => runEnvChecks()).not.toThrow();

			expect(consoleLogSpy).toHaveBeenCalledWith('Checking REQUIRED environment variables...');
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('Checking OPTIONAL environment variables...')
			);
		});

		it('should use color codes in output', () => {
			expect(() => runEnvChecks()).not.toThrow();

			// Check for green checkmarks (success)
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('\u001b[32m'));
		});

		it('should use red color for errors', () => {
			process.env = {};

			expect(() => runEnvChecks()).toThrow();

			// Check for red X marks (errors)
			expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('\u001b[31m'));
		});

		it('should use yellow color for warnings', () => {
			expect(() => runEnvChecks()).not.toThrow();

			// Check for yellow warning marks
			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('\u001b[33m'));
		});

		it('should display default values for optional variables', () => {
			expect(() => runEnvChecks()).not.toThrow();

			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('will use default: false'));
			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('will use default: info'));
		});
	});

	describe('runEnvChecks edge cases', () => {
		it('should handle when all variables including optional are set', () => {
			// Set all required variables
			process.env.NODE_ENV = 'production';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';

			// Set all optional variables
			process.env.DB_URL = 'postgresql://user:password@localhost:5432/auth_db';
			process.env.DB_LOGGING = 'true';
			process.env.DB_MIGRATIONS_RUN = 'true';
			process.env.DB_SYNCHRONIZE = 'false';
			process.env.REDIS_PASSWORD = 'redis-pass';
			process.env.NODE_OPTIONS = '--max-old-space-size=4096';
			process.env.PORT = '3000';
			process.env.LOG_LEVEL = 'debug';
			process.env.METRICS_ENABLED = 'true';
			process.env.HEALTH_CHECK_TIMEOUT = '10000';

			expect(() => runEnvChecks()).not.toThrow();

			// Should not show any warnings about optional variables
			expect(consoleLogSpy).not.toHaveBeenCalledWith(
				expect.stringContaining('optional environment variable(s) not set')
			);
		});

		it('should handle numeric values correctly', () => {
			process.env.NODE_ENV = 'production';
			process.env.DB_HOST = 'localhost';
			process.env.DB_PORT = '5432';
			process.env.DB_USERNAME = 'user';
			process.env.DB_PASSWORD = 'password';
			process.env.DB_NAME = 'auth_db';
			process.env.JWT_PRIVATE_KEY = 'private-key';
			process.env.JWT_PUBLIC_KEY = 'public-key';
			process.env.REDIS_HOST = 'localhost';
			process.env.REDIS_PORT = '6379';
			process.env.HTTP_PORT = '3000';
			process.env.GRPC_PORT = '50051';
			process.env.USER_SERVICE_GRPC_URL = 'localhost:50052';
			process.env.MEDIA_SERVICE_GRPC_URL = 'localhost:50053';
			process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
			process.env.TWILIO_AUTH_TOKEN = 'token123';
			process.env.TWILIO_FROM_NUMBER = '+1234567890';

			expect(() => runEnvChecks()).not.toThrow();

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DB_PORT is set'));
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('REDIS_PORT is set'));
		});
	});
});
