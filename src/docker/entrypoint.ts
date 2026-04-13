import runEnvChecks, { USER_SERVICE_ENV_CONFIG } from './check-env';

export function runEntrypoint() {
	try {
		// Run environment checks. Will throw on missing required vars
		runEnvChecks(USER_SERVICE_ENV_CONFIG);

		if (process.env.NODE_ENV !== 'test') {
			console.log('Starting User Service...\n');
		}

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { bootstrap } = require('../main');
		bootstrap();
	} catch (err) {
		// If environment checks failed, log and exit non-zero so container fails fast
		console.error('Entrypoint failed:', err instanceof Error ? err.message : err);
		process.exit(1);
	}
}

// Auto-run when module is imported directly (not during tests)
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
	runEntrypoint();
}
