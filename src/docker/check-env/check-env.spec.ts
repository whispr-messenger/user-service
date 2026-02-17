import runEnvChecks from './check-env';
import { EnvCheckConfig } from './types';

const TEST_SERVICE_NAME = 'Test Service';

const TEST_CONFIG: EnvCheckConfig = {
	serviceName: TEST_SERVICE_NAME,
	required: [
		'NODE_ENV',
		'DATABASE_HOST',
		'DATABASE_PORT',
		'DATABASE_USERNAME',
		'DATABASE_PASSWORD',
		'DATABASE_NAME',
		'REDIS_URL',
		'HTTP_PORT',
		'GRPC_PORT',
	],
	optional: [
		{ name: 'DATABASE_URL', default: '(constructed from individual DATABASE vars)' },
		{ name: 'DATABASE_LOGGING', default: 'false' },
		{ name: 'DATABASE_MIGRATIONS_RUN', default: 'false' },
		{ name: 'DATABASE_SYNCHRONIZE', default: 'false' },
		{ name: 'NODE_OPTIONS', default: '(default Node settings)' },
		{ name: 'PORT', default: '(defaults to HTTP_PORT)' },
		{ name: 'LOG_LEVEL', default: 'info' },
		{ name: 'METRICS_ENABLED', default: 'true' },
		{ name: 'HEALTH_CHECK_TIMEOUT', default: '5000' },
	],
};

const REQUIRED_VARS = TEST_CONFIG.required;

const REQUIRED_VALUES: Record<string, string> = {
	NODE_ENV: 'production',
	DATABASE_HOST: 'localhost',
	DATABASE_PORT: '5432',
	DATABASE_USERNAME: 'user',
	DATABASE_PASSWORD: 'password',
	DATABASE_NAME: 'user_service',
	REDIS_URL: 'redis://localhost:6379/0',
	HTTP_PORT: '3000',
	GRPC_PORT: '50051',
};

describe('runEnvChecks', () => {
	let originalEnv: NodeJS.ProcessEnv;
	let consoleLogSpy: jest.SpyInstance;
	let consoleErrorSpy: jest.SpyInstance;
	let consoleWarnSpy: jest.SpyInstance;

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
		for (const [key, value] of Object.entries(REQUIRED_VALUES)) {
			process.env[key] = value;
		}
	};

	describe('Success cases', () => {
		it('should pass when all required environment variables are set', () => {
			setAllRequired();
			expect(() => runEnvChecks(TEST_CONFIG)).not.toThrow();

			// Verify success message with color
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					`${colors.green}✓ All required environment variables are set!${colors.reset}`
				)
			);
		});

		it('should check all required variables', () => {
			setAllRequired();
			runEnvChecks(TEST_CONFIG);

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

				expect(() => runEnvChecks(TEST_CONFIG)).toThrow('Missing required environment variables');
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					expect.stringContaining(`${colors.red}✗${colors.reset} ${varName} is NOT set (REQUIRED)`)
				);
			});

			it(`should throw error when ${varName} is an empty string`, () => {
				setAllRequired();
				process.env[varName] = '';

				expect(() => runEnvChecks(TEST_CONFIG)).toThrow('Missing required environment variables');
				expect(consoleErrorSpy).toHaveBeenCalledWith(
					expect.stringContaining(`${colors.red}✗${colors.reset} ${varName} is NOT set (REQUIRED)`)
				);
			});

			it(`should throw error when ${varName} contains only whitespace`, () => {
				setAllRequired();
				process.env[varName] = '   ';

				expect(() => runEnvChecks(TEST_CONFIG)).toThrow('Missing required environment variables');
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

			expect(() => runEnvChecks(TEST_CONFIG)).toThrow('Missing required environment variables');

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
			runEnvChecks(TEST_CONFIG);

			// Verify one of the optional vars (e.g. DATABASE_LOGGING)
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					`${colors.yellow}⚠${colors.reset} DATABASE_LOGGING is NOT set (will use default: false)`
				)
			);

			// Should report total count of optional vars not set
			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(`${colors.yellow}WARNING:`));
		});

		it('should log success when optional variable is set', () => {
			setAllRequired();
			process.env.DATABASE_LOGGING = 'true';
			process.env.LOG_LEVEL = 'debug';

			runEnvChecks(TEST_CONFIG);

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

			runEnvChecks(TEST_CONFIG);

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
			runEnvChecks(TEST_CONFIG);

			expect(consoleLogSpy).toHaveBeenCalledWith('==================================================');
			expect(consoleLogSpy).toHaveBeenCalledWith(`  ${TEST_SERVICE_NAME} - Environment Check`);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('Checking REQUIRED environment variables...')
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('Checking OPTIONAL environment variables...')
			);
		});

		it('should display the configured service name in header', () => {
			setAllRequired();
			const customConfig: EnvCheckConfig = {
				serviceName: 'My Custom Service',
				required: REQUIRED_VARS,
				optional: [],
			};

			runEnvChecks(customConfig);

			expect(consoleLogSpy).toHaveBeenCalledWith('  My Custom Service - Environment Check');
		});
	});

	describe('Configuration flexibility', () => {
		it('should work with a minimal configuration', () => {
			process.env.ONLY_VAR = 'set';
			const minimalConfig: EnvCheckConfig = {
				serviceName: 'Minimal',
				required: ['ONLY_VAR'],
				optional: [],
			};

			expect(() => runEnvChecks(minimalConfig)).not.toThrow();

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining(`${colors.green}✓${colors.reset} ONLY_VAR is set`)
			);
			expect(consoleLogSpy).toHaveBeenCalledWith('  Minimal - Environment Check');
		});

		it('should work with no required and only optional variables', () => {
			const optionalOnlyConfig: EnvCheckConfig = {
				serviceName: 'Optional Only',
				required: [],
				optional: [{ name: 'SOME_OPT', default: 'fallback' }],
			};

			expect(() => runEnvChecks(optionalOnlyConfig)).not.toThrow();

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					`${colors.yellow}⚠${colors.reset} SOME_OPT is NOT set (will use default: fallback)`
				)
			);
		});

		it('should not accumulate counters across multiple calls', () => {
			setAllRequired();
			runEnvChecks(TEST_CONFIG);

			// Second call with a missing var should report exactly 1 missing, not accumulated
			delete process.env.NODE_ENV;
			const smallConfig: EnvCheckConfig = {
				serviceName: 'Test',
				required: ['NODE_ENV'],
				optional: [],
			};

			expect(() => runEnvChecks(smallConfig)).toThrow('Missing required environment variables');
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					`${colors.red}ERROR: 1 required environment variable(s) missing!${colors.reset}`
				)
			);
		});
	});
});
