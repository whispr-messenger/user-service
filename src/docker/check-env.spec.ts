describe('runEnvChecks', () => {
	let originalEnv: NodeJS.ProcessEnv;
	let consoleLogSpy: jest.SpyInstance;
	let consoleErrorSpy: jest.SpyInstance;
	let consoleWarnSpy: jest.SpyInstance;
	let runEnvChecks: () => void;

	const REQUIRED_VARS = [
		'NODE_ENV',
		'DATABASE_HOST',
		'DATABASE_PORT',
		'DATABASE_USERNAME',
		'DATABASE_PASSWORD',
		'DATABASE_NAME',
		'REDIS_URL',
		'HTTP_PORT',
		'GRPC_PORT',
	];

	const colors = {
		reset: '\u001b[0m',
		red: '\u001b[31m',
		green: '\u001b[32m',
		yellow: '\u001b[33m',
	};

	beforeEach(() => {
		// Save original environment
		originalEnv = { ...process.env };

		// Mock console methods
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

		// Clear environment variables
		process.env = {};

		// Clear module cache to reset the global counters (missingVars, optionalVars)
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

	const setAllRequired = () => {
		process.env.NODE_ENV = 'production';
		process.env.DATABASE_HOST = 'localhost';
		process.env.DATABASE_PORT = '5432';
		process.env.DATABASE_USERNAME = 'user';
		process.env.DATABASE_PASSWORD = 'password';
		process.env.DATABASE_NAME = 'user_service';
		process.env.REDIS_URL = 'redis://localhost:6379/0';
		process.env.HTTP_PORT = '3000';
		process.env.GRPC_PORT = '50051';
	};

	describe('Success cases', () => {
		it('should pass when all required environment variables are set', () => {
			setAllRequired();
			expect(() => runEnvChecks()).not.toThrow();

			// Verify success message with color
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					`${colors.green}✓ All required environment variables are set!${colors.reset}`
				)
			);
		});

		it('should check all 10 required variables', () => {
			setAllRequired();
			runEnvChecks();

			REQUIRED_VARS.forEach((varName) => {
				expect(consoleLogSpy).toHaveBeenCalledWith(
					expect.stringContaining(`${colors.green}✓${colors.reset} ${varName} is set`)
				);
			});
		});
	});

	describe('Required variables validation (Edge cases)', () => {
		REQUIRED_VARS.forEach((varName) => {
			it(`should throw error when ${varName} is missing`, () => {
				setAllRequired();
				delete process.env[varName];

				expect(() => runEnvChecks()).toThrow('Missing required environment variables');
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					expect.stringContaining(`${colors.red}✗${colors.reset} ${varName} is NOT set (REQUIRED)`)
				);
			});

			it(`should throw error when ${varName} is an empty string`, () => {
				setAllRequired();
				process.env[varName] = '';

				expect(() => runEnvChecks()).toThrow('Missing required environment variables');
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					expect.stringContaining(`${colors.red}✗${colors.reset} ${varName} is NOT set (REQUIRED)`)
				);
			});

			it(`should throw error when ${varName} contains only whitespace`, () => {
				setAllRequired();
				process.env[varName] = '   ';

				expect(() => runEnvChecks()).toThrow('Missing required environment variables');
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					expect.stringContaining(`${colors.red}✗${colors.reset} ${varName} is NOT set (REQUIRED)`)
				);
			});
		});
	});

	describe('Multiple missing variables', () => {
		it('should report the correct count of missing required variables', () => {
			setAllRequired();
			delete process.env.NODE_ENV;
			delete process.env.DATABASE_HOST;
			process.env.DATABASE_PORT = '';

			expect(() => runEnvChecks()).toThrow('Missing required environment variables');

			// Should report 3 missing
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					`${colors.red}ERROR: 3 required environment variable(s) missing!${colors.reset}`
				)
			);
		});
	});

	describe('Optional variables', () => {
		it('should warn when optional variables are missing', () => {
			setAllRequired();
			runEnvChecks();

			// Verify one of the optional vars (e.g. DATABASE_LOGGING)
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					`${colors.yellow}⚠${colors.reset} DATABASE_LOGGING is NOT set (will use default: false)`
				)
			);

			// Should report total count of optional vars not set
			// There are about 10 optional checks in the script
			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(`${colors.yellow}WARNING:`));
		});

		it('should log success when optional variable is set', () => {
			setAllRequired();
			process.env.DATABASE_LOGGING = 'true';
			process.env.LOG_LEVEL = 'debug';

			runEnvChecks();

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining(`${colors.green}✓${colors.reset} DATABASE_LOGGING is set`)
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining(`${colors.green}✓${colors.reset} LOG_LEVEL is set`)
			);
		});

		it('should treat empty/whitespace optional variables as unset', () => {
			setAllRequired();
			process.env.LOG_LEVEL = ' ';

			runEnvChecks();

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					`${colors.yellow}⚠${colors.reset} LOG_LEVEL is NOT set (will use default: info)`
				)
			);
		});
	});

	describe('Output Formatting', () => {
		it('should log visual headers and footers', () => {
			setAllRequired();
			runEnvChecks();

			expect(consoleLogSpy).toHaveBeenCalledWith('==================================================');
			expect(consoleLogSpy).toHaveBeenCalledWith('  Whispr User Service - Environment Check');
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('Checking REQUIRED environment variables...')
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('Checking OPTIONAL environment variables...')
			);
		});
	});
});
