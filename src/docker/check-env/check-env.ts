import { EnvCheckConfig } from './types';

// Environment validation for production container
const colors = {
	reset: '\u001b[0m',
	red: '\u001b[31m',
	green: '\u001b[32m',
	yellow: '\u001b[33m',
};

export default function runEnvChecks(config: EnvCheckConfig): void {
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

	console.log('==================================================');
	console.log(`  ${config.serviceName} - Environment Check`);
	console.log('==================================================\n');

	console.log('Checking REQUIRED environment variables...');

	for (const varName of config.required) {
		checkRequired(varName);
	}

	console.log('\nChecking OPTIONAL environment variables...');

	for (const { name, default: defaultValue } of config.optional) {
		checkOptional(name, defaultValue);
	}

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
