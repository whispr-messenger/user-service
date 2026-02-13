// Environment validation for production container
const colors = {
	reset: '\u001b[0m',
	red: '\u001b[31m',
	green: '\u001b[32m',
	yellow: '\u001b[33m',
};

let missingVars = 0;
let optionalVars = 0;

function checkRequired(varName: string): boolean {
	const value = process.env[varName];
	if (!value || value.trim() === '') {
		console.error(`${colors.red}✗${colors.reset} ${varName} is NOT set (REQUIRED)`);
		missingVars++;
		return false;
	}
	console.log(`${colors.green}✓${colors.reset} ${varName} is set`);
	return true;
}

function checkOptional(varName: string, defaultValue = ''): boolean {
	const value = process.env[varName];
	if (!value || value.trim() === '') {
		const msg = defaultValue ? ` (will use default: ${defaultValue})` : '';
		console.warn(`${colors.yellow}⚠${colors.reset} ${varName} is NOT set${msg}`);
		optionalVars++;
		return false;
	}
	console.log(`${colors.green}✓${colors.reset} ${varName} is set`);
	return true;
}

export default function runEnvChecks(): void {
	console.log('==================================================');
	console.log('  Whispr User Service - Environment Check');
	console.log('==================================================\n');

	console.log('Checking REQUIRED environment variables...');

	// Node
	checkRequired('NODE_ENV');

	// Database
	checkRequired('DATABASE_HOST');
	checkRequired('DATABASE_PORT');
	checkRequired('DATABASE_USERNAME');
	checkRequired('DATABASE_PASSWORD');
	checkRequired('DATABASE_NAME');

	// Redis
	checkRequired('REDIS_URL');

	// Ports
	checkRequired('HTTP_PORT');
	checkRequired('GRPC_PORT');

	console.log('\nChecking OPTIONAL environment variables...');

	checkOptional('DATABASE_URL', '(constructed from individual DATABASE vars)');
	checkOptional('DATABASE_LOGGING', 'false');
	checkOptional('DATABASE_MIGRATIONS_RUN', 'false');
	checkOptional('DATABASE_SYNCHRONIZE', 'false');
	checkOptional('NODE_OPTIONS', '(default Node settings)');
	checkOptional('PORT', '(defaults to HTTP_PORT)');
	checkOptional('LOG_LEVEL', 'info');
	checkOptional('METRICS_ENABLED', 'true');
	checkOptional('HEALTH_CHECK_TIMEOUT', '5000');

	console.log('\n==================================================');

	if (missingVars > 0) {
		console.error(
			`${colors.red}ERROR: ${missingVars} required environment variable(s) missing!${colors.reset}`
		);
		throw new Error('Missing required environment variables');
	}

	if (optionalVars > 0) {
		console.warn(
			`${colors.yellow}WARNING: ${optionalVars} optional environment variable(s) not set.${colors.reset}`
		);
	}

	console.log(`${colors.green}✓ All required environment variables are set!${colors.reset}`);
	console.log('==================================================\n');
}
