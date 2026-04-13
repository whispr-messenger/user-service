import runEnvChecks, { USER_SERVICE_ENV_CONFIG } from './check-env';

export function runEntrypoint() {
	try {
		// Run environment checks. Will throw on missing required vars
		runEnvChecks(USER_SERVICE_ENV_CONFIG);

		if (process.env.NODE_ENV !== 'test') {
			console.log('Starting User Service...\n');
		}

		// Dynamic import to load main.js, then call exported bootstrap()
		// At runtime: dist/docker/entrypoint.js → dist/main.js
		import('../main.js').then((m) => m.bootstrap());
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
