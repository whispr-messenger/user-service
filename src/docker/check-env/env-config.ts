import { EnvCheckConfig } from './types';

export const USER_SERVICE_ENV_CONFIG: EnvCheckConfig = {
	serviceName: 'Whispr User Service',
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
