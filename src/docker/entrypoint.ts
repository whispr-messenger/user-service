import runEnvChecks, { USER_SERVICE_ENV_CONFIG } from './check-env';

export function runEntrypoint() {
	try {
		// Run environment checks. Will throw on missing required vars
		runEnvChecks(USER_SERVICE_ENV_CONFIG);

		if (process.env.NODE_ENV !== 'test') {
			console.log('Starting User Service...\n');
		}

		// Import main.js which will automatically call bootstrap()
		// At runtime this will be dist/docker/entrypoint.js importing dist/main.js
		// The import side-effect will start the NestJS application
		import('../main.js');
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
